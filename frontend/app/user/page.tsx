"use client";

import {
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { updateUserPassword, updateUserProfile } from "../lib/apiClient";

export default function UserSettings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const form = useForm({
    initialValues: {
      username: "",
      first_name: "",
      last_name: "",
      email: "",
    },
  });

  const passwordForm = useForm({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      newPassword: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? "Passwords do not match" : null,
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      form.setValues({
        username: user.username || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
      });
    }
  }, [user, loading, router]);

  const handleUpdateProfile = async (values: typeof form.values) => {
    if (!user) return;

    try {
      setUpdating(true);
      await updateUserProfile(user.id, values);
      notifications.show({
        title: "Success",
        message: "Profile updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update profile",
        color: "red",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (values: typeof passwordForm.values) => {
    if (!user) return;

    try {
      setUpdating(true);
      await updateUserPassword(user.id, values.newPassword);
      notifications.show({
        title: "Success",
        message: "Password updated successfully",
        color: "green",
      });
      passwordForm.reset();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update password",
        color: "red",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <Container size="sm" className="py-20 mt-20 w-[28em]">
      <Title order={1} mb="xl" className="text-center">
        User Settings
      </Title>

      <Paper shadow="xs" p="xl" mb="xl" withBorder>
        <Title order={2} size="h3" mb="md">
          Profile Information
        </Title>
        <form onSubmit={form.onSubmit(handleUpdateProfile)}>
          <Stack gap="md">
            <TextInput
              label="Username"
              placeholder="Enter username"
              {...form.getInputProps("username")}
            />
            <TextInput
              label="First Name"
              placeholder="Enter first name"
              {...form.getInputProps("first_name")}
            />
            <TextInput
              label="Last Name"
              placeholder="Enter last name"
              {...form.getInputProps("last_name")}
            />
            <TextInput
              label="Email"
              placeholder="Enter email"
              type="email"
              {...form.getInputProps("email")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => router.push("/")}>
                Cancel
              </Button>
              <Button type="submit" loading={updating}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Paper shadow="xs" p="xl" withBorder>
        <Title order={2} size="h3" mb="md">
          Change Password
        </Title>
        <form onSubmit={passwordForm.onSubmit(handleUpdatePassword)}>
          <Stack gap="md">
            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              {...passwordForm.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              {...passwordForm.getInputProps("confirmPassword")}
            />
            <Group justify="flex-end" mt="md">
              <Button type="submit" loading={updating}>
                Update Password
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}