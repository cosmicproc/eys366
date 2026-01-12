"""
Syllabus Import Service
Extracts course contents, course outcomes from syllabus PDFs
using PyMuPDF4LLM for PDF parsing and an OpenAI-compatible LLM API for extraction.
"""

import json
import os
import re
from typing import Any, Dict

# PDF parsing
import fitz  # PyMuPDF
import pymupdf4llm
from openai import OpenAI

# LLM API configuration - can be overridden via environment variables
LLM_API_URL = os.environ.get("LLM_API_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "mlx-community/Qwen3-4B-4bit")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "ollama")

# Maximum allowed PDF size (10 MB)
MAX_PDF_SIZE = 10 * 1024 * 1024

# Initialize OpenAI client
_client = None

def get_client() -> OpenAI:
    """Get or initialize the OpenAI client (singleton pattern)."""
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=LLM_API_URL,
            api_key=LLM_API_KEY,
        )
    return _client


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF4LLM."""
    md_text = pymupdf4llm.to_markdown(pdf_path)
    return md_text


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF4LLM."""
    # Open PDF from bytes using fitz (PyMuPDF) with context manager
    # to ensure proper cleanup even if an exception occurs
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        md_text = pymupdf4llm.to_markdown(doc)
    return md_text


def build_extraction_prompt(syllabus_text: str) -> str:
    """Build the prompt for the LLM to extract course structure."""
    # Truncate text if too long to fit in context
    max_chars = 6000  # Leave room for prompt and response
    if len(syllabus_text) > max_chars:
        syllabus_text = syllabus_text[:max_chars] + "\n...[truncated]..."
    
    prompt = f"""Analyze the following course syllabus and extract structured information.

Extract these two things:

1. Course Contents (CC): These are ONLY the evaluation/assessment methods used to grade students.
   Examples: Midterm Exam, Final Exam, Project, Homework, Quiz, Presentation, Lab Report, Attendance, Participation
   DO NOT include weekly topics, lecture subjects, or chapter names as course contents.

2. Course Outcomes (CO): These are the learning outcomes, learning objectives, or competencies.
   Look for sections titled: "Learning Outcomes", "Course Outcomes", "Learning Objectives", "Course Objectives", "Competencies"
   Extract each item from the list exactly as written.

IMPORTANT RULES:
- Extract text EXACTLY as written in the syllabus, do not modify or rephrase

Output ONLY valid JSON in this exact format:
{{
  "course_contents": [
    "Exact name from syllabus"
  ],
  "course_outcomes": [
    "Exact outcome text from syllabus"
  ],
}}

SYLLABUS:
{syllabus_text}

Respond with ONLY the JSON object, no explanation or markdown:"""
    return prompt


def parse_llm_response(response_text: str) -> Dict[str, Any]:
    """Parse the LLM response to extract JSON."""
    # Try to find JSON in the response
    response_text = response_text.strip()
    
    # Remove thinking tags if present (Qwen3 may use these)
    response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
    response_text = response_text.strip()
    
    # Try to extract JSON from the response
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    # If no valid JSON found, return empty structure
    return {
        "course_contents": [],
        "course_outcomes": [],
        "parse_error": "Could not parse LLM response"
    }


def extract_syllabus_structure(syllabus_text: str) -> Dict[str, Any]:
    """
    Use LLM API to extract course structure from syllabus text.
    Returns dict with course_contents, course_outcomes.
    """
    prompt = build_extraction_prompt(syllabus_text)
    
    # Call LLM API using OpenAI client
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured data from academic syllabi. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2048,
        )
        
        response_text = response.choices[0].message.content or ""
        
    except Exception as e:
        error_msg = str(e)
        if "Connection" in error_msg or "connect" in error_msg.lower():
            return {
                "course_contents": [],
                "course_outcomes": [],
                "parse_error": "The AI service is currently unavailable. Please try again later."
            }
        return {
            "course_contents": [],
            "course_outcomes": [],
            "parse_error": "Failed to analyze the syllabus. Please try again or contact support."
        }
    
    result = parse_llm_response(response_text)
    
    # Validate and clean up the result
    result = validate_and_clean_result(result)
    
    return result


def validate_and_clean_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean the extracted result."""
    # Ensure required keys exist
    if "course_contents" not in result:
        result["course_contents"] = []
    if "course_outcomes" not in result:
        result["course_outcomes"] = []
    
    # Clean course contents - handle both string arrays and object arrays
    cleaned_contents = []
    for i, cc in enumerate(result["course_contents"]):
        if isinstance(cc, str):
            # New format: just strings
            name = cc.strip()
            if name:
                cleaned_contents.append({
                    "name": name[:255],
                    "index": i,
                })
        elif isinstance(cc, dict) and "name" in cc:
            # Old format: objects with "name" key
            cleaned_contents.append({
                "name": str(cc["name"])[:255],
                "index": i,
            })
    result["course_contents"] = cleaned_contents
    
    # Clean course outcomes - handle both string arrays and object arrays
    cleaned_outcomes = []
    for i, co in enumerate(result["course_outcomes"]):
        name = co.strip()
        if name:
            cleaned_outcomes.append({
                "name": name[:255],
                "index": i,
            })
    result["course_outcomes"] = cleaned_outcomes
    
    return result


def process_syllabus(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Main entry point: process a PDF syllabus and extract structure.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        
    Returns:
        Dict containing:
        - course_contents: List of {name, index}
        - course_outcomes: List of {name, index}
        - raw_text: Extracted text from PDF (truncated)
    """
    # Check PDF size to prevent memory issues
    if len(pdf_bytes) > MAX_PDF_SIZE:
        return {
            "course_contents": [],
            "course_outcomes": [],
            "parse_error": f"PDF file too large. Maximum allowed size is {MAX_PDF_SIZE // (1024 * 1024)} MB."
        }
    
    # Extract text from PDF
    syllabus_text = extract_text_from_pdf_bytes(pdf_bytes)
    
    # Extract structure using LLM
    result = extract_syllabus_structure(syllabus_text)
    
    return result
