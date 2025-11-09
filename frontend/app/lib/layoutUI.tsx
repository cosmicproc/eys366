import Link from "next/link";
import NewItemButton from "./NewItemButton";

export default function RootUILayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col flex-grow">
            <header className="flex justify-center absolute top-0 left-0 w-full z-10">
                <div className="py-3 w-[35em] mx-12 my-4 font-bold border-2 border-neutral-400 bg-blue-100/30 backdrop-blur rounded-4xl shadow-md relative text-center">
                    <Link href="/" className="text-2xl">
                        {process.env.NEXT_PUBLIC_APP_NAME}
                    </Link>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <NewItemButton />
                    </div>
                </div>
            </header>
            {children}
        </div>
    );
}
