"use client";

import {
  Button,
  Card,
  Container,
  Text,
  Title,
  Stack,
  PasswordInput,
} from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLock } from "@tabler/icons-react";
import { useState, Suspense } from "react";
import { resetPassword } from "../lib/apiClient";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Container size="xs" className="w-full">
          <Card
            shadow="xl"
            padding="xl"
            radius="lg"
            className="backdrop-blur-sm bg-white/90"
          >
            <Stack gap="lg" align="center">
              <Title order={2} c="green">
                Password Reset Successful!
              </Title>
              <Text c="dimmed">Redirecting to login...</Text>
            </Stack>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Container size="xs" className="w-full">
        <Card
          shadow="xl"
          padding="xl"
          radius="lg"
          className="backdrop-blur-sm bg-white/90"
        >
          <form onSubmit={handleReset}>
            <Stack gap="lg">
              <div className="text-center">
                <Title order={1} className="mb-2">
                  Reset Password
                </Title>
                <Text size="md" c="dimmed">
                  Enter your new password
                </Text>
              </div>

              {error && (
                <Text c="red" size="sm" ta="center">
                  {error}
                </Text>
              )}

              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftSection={<IconLock size={16} />}
                required
                size="md"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftSection={<IconLock size={16} />}
                required
                size="md"
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                gradient={{ from: "blue", to: "purple", deg: 90 }}
                variant="gradient"
              >
                Reset Password
              </Button>
            </Stack>
          </form>
        </Card>
      </Container>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
