export default function RootUILayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col flex-grow">
            <header className="w-full p-4 text-center font-bold text-xl bg-neutral-300 shadow-sm">
                {process.env.APP_NAME}
            </header>
            {children}
            <footer className="mt-auto text-center w-full text-sm py-2 border-t text-neutral-500">
                {process.env.CUSTOMER_NAME}
            </footer>
        </div>
    );
}
