import { NextResponse } from "next/server";

// Mock data matching the API response structure
// Note: The API spec doesn't include weight in relations, but we could extend it
const mockData = {
    course_contents: [
        {
            id: 1,
            name: "Lecture 1: Introduction",
            relations: [
                { node1_id: 1, node2_id: 5, relation_id: 1 },
                { node1_id: 1, node2_id: 6, relation_id: 2 },
            ],
        },
        {
            id: 2,
            name: "Lecture 2: Fundamentals",
            relations: [
                { node1_id: 2, node2_id: 6, relation_id: 3 },
                { node1_id: 2, node2_id: 7, relation_id: 4 },
            ],
        },
        {
            id: 3,
            name: "Lab 1: Practical Skills",
            relations: [
                { node1_id: 3, node2_id: 7, relation_id: 5 },
                { node1_id: 3, node2_id: 8, relation_id: 6 },
            ],
        },
        {
            id: 4,
            name: "Assignment 1",
            relations: [{ node1_id: 4, node2_id: 8, relation_id: 7 }],
        },
    ],
    course_outcomes: [
        {
            id: 5,
            name: "CO1: Apply Core Concepts",
            relations: [
                { node1_id: 5, node2_id: 10, relation_id: 8 },
                { node1_id: 5, node2_id: 11, relation_id: 9 },
            ],
        },
        {
            id: 6,
            name: "CO2: Analyze Problems",
            relations: [
                { node1_id: 6, node2_id: 11, relation_id: 10 },
                { node1_id: 6, node2_id: 12, relation_id: 11 },
            ],
        },
        {
            id: 7,
            name: "CO3: Design Solutions",
            relations: [
                { node1_id: 7, node2_id: 12, relation_id: 12 },
                { node1_id: 7, node2_id: 13, relation_id: 13 },
            ],
        },
        {
            id: 8,
            name: "CO4: Evaluate Methods",
            relations: [{ node1_id: 8, node2_id: 13, relation_id: 14 }],
        },
        {
            id: 9,
            name: "CO5: Communicate Effectively",
            relations: [],
        },
    ],
    program_outcomes: [
        {
            id: 10,
            name: "PO1: Engineering Knowledge",
            relations: [],
        },
        {
            id: 11,
            name: "PO2: Problem Analysis",
            relations: [],
        },
        {
            id: 12,
            name: "PO3: Design/Development",
            relations: [],
        },
        {
            id: 13,
            name: "PO4: Professional Skills",
            relations: [],
        },
    ],
};

export async function GET() {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return NextResponse.json(mockData);
}
