"use client";

import {
  Anchor,
  Button,
  Card,
  Container,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { IconLock, IconUser } from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestPasswordReset } from "../lib/apiClient";
import { useAuth } from "../lib/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      router.push("/");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetLoading(true);
    setError("");
    setResetSuccess("");
    try {
      await requestPasswordReset(resetEmail);
      setResetSuccess("Password reset link sent to your email");
      setResetEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Container size="xs" className="w-full">
        <Card
          shadow="md"
          padding="xl"
          radius="lg"
          className="backdrop-blur-sm bg-white/90 border-gray-200 border"
        >
          <form onSubmit={handleLogin}>
            <Stack gap="lg">
              {/* Header */}
              <div className="text-center">
                <Image
                  src="/eys366.png"
                  alt="EYS-366 Logo"
                  width={80}
                  height={80}
                  className="mx-auto mb-1"
                />
                <Title
                  order={1}
                  className="mb-2 bg-linear-to-r bg-clip-text"
                >
                  EYS-366
                </Title>
                <Text size="md" c="dimmed">
                  Educational Management System
                </Text>
              </div>

              {/* Error Message */}
              {error && (
                <Text c="red" size="sm" ta="center">
                  {error}
                </Text>
              )}

              {/* Login Form */}
              <TextInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftSection={<IconUser size={16} />}
                required
                size="md"
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftSection={<IconLock size={16} />}
                required
                size="md"
              />

              <div className="text-right">
                <Anchor
                  size="sm"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="cursor-pointer"
                >
                  Forgot password?
                </Anchor>
              </div>

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                gradient={{ from: "blue", to: "purple", deg: 90 }}
                variant="gradient"
              >
                Login
              </Button>
            </Stack>
          </form>
        </Card>
      </Container>

      {/* Forgot Password Modal */}
      <Modal
        opened={forgotPasswordOpen}
        onClose={() => {
          setForgotPasswordOpen(false);
          setResetSuccess("");
          setError("");
        }}
        title="Reset Password"
        centered
      >
        <Stack gap="md">
          {resetSuccess && (
            <Text c="green" size="sm">
              {resetSuccess}
            </Text>
          )}
          <TextInput
            label="Email"
            placeholder="Enter your email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            type="email"
            required
          />
          <Button
            fullWidth
            loading={resetLoading}
            onClick={handleForgotPassword}
          >
            Send Reset Link
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
