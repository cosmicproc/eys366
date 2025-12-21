"use client";

import { Button, Card, Container, Text, Title, Stack, TextInput, PasswordInput, Avatar } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { IconSchool, IconUser, IconLock } from "@tabler/icons-react";
import { useState } from "react";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <Container size="xs" className="w-full">
                <Card shadow="xl" padding="xl" radius="lg" className="backdrop-blur-sm bg-white/90">
                    <form onSubmit={handleLogin}>
                        <Stack gap="lg">
                            {/* Header */}
                            <div className="text-center">
                                <Avatar
                                    size="xl"
                                    radius="xl"
                                    className="mx-auto mb-4"
                                    variant="gradient"
                                    gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
                                >
                                    <IconSchool size={40} />
                                </Avatar>
                                <Title order={1} className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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

                            <Button
                                type="submit"
                                fullWidth
                                size="md"
                                loading={loading}
                                gradient={{ from: 'blue', to: 'purple', deg: 90 }}
                                variant="gradient"
                            >
                                Login
                            </Button>

                            <Text size="xs" c="dimmed" className="text-center">
                                This is a simulation environment for demonstration purposes
                            </Text>
                        </Stack>
                    </form>
                </Card>
            </Container>
        </div>
    );
}
