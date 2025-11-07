import "@mantine/core/styles.css";
import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";

import {
    ColorSchemeScript,
    MantineProvider,
    mantineHtmlProps,
} from "@mantine/core";
import RootUILayout from "./lib/layoutUI";

const libreBaskerville = Libre_Baskerville({
    variable: "--font-librebaskerville-sans",
    subsets: ["latin"],
    weight: ["400", "700"],
});

export const metadata: Metadata = {
    title: process.env.APP_NAME,
    description: "",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            {...mantineHtmlProps}
            className={libreBaskerville.variable}
        >
            <head>
                <ColorSchemeScript />
            </head>
            <body
                className={`${libreBaskerville.className} flex min-h-screen flex-col`}
            >
                <MantineProvider>
                    <RootUILayout>{children}</RootUILayout>
                </MantineProvider>
            </body>
        </html>
    );
}
