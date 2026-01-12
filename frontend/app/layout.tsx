import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

import {
    ColorSchemeScript,
    MantineProvider,
    mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import RootUILayout from "./lib/layoutUI";

const libreBaskerville = Outfit({
    subsets: ["latin"],
    weight: ["400", "700"],
});

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_APP_NAME,
    icons: {
        icon: "/eys366.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript />
            </head>
            <body
                className={`${libreBaskerville.className} flex min-h-screen flex-col`}
            >
                <MantineProvider>
                    <Notifications position="top-right" />
                    <RootUILayout>{children}</RootUILayout>
                </MantineProvider>
            </body>
        </html>
    );
}
