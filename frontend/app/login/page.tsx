"use client";

import { Button, Card, Container, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (username: string) => {
        try {
            await login(username);
            router.push("/");
        } catch {
            alert("Login failed");
        }
    };

    return (
        <Container size="xs" className="h-screen flex items-center justify-center">
            <Card shadow="sm" padding="lg" radius="md" withBorder className="w-full">
                <Title order={2} className="text-center mb-6">
                    Login to Giraph
                </Title>

                <Text size="sm" c="dimmed" className="text-center mb-4">
                    Select a role to simulate login:
                </Text>

                <div className="space-y-3">
                    <Button
                        fullWidth
                        variant="light"
                        onClick={() => handleLogin("lecturer_a")}
                    >
                        Login as Lecturer A (Course 1)
                    </Button>

                    <Button
                        fullWidth
                        variant="light"
                        color="orange"
                        onClick={() => handleLogin("lecturer_b")}
                    >
                        Login as Lecturer B (Course 2)
                    </Button>

                    <Button
                        fullWidth
                        variant="filled"
                        color="grape"
                        onClick={() => handleLogin("head")}
                    >
                        Login as Department Head
                    </Button>
                </div>
            </Card>
        </Container>
    );
}
