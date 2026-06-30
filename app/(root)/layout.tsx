
import  {Footer}  from "@/features/home/footer";
import  {Header}  from "@/features/home/header";
import type { Metadata } from "next";
// import { usePathname } from "next/navigation";

export const metadata: Metadata = {
    title: {
        template: "VibeCode - Editor ",
        default: "Code Editor For VibeCoders - VibeCode",
    },
};

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-white dark:bg-black">
            <Header />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    );
}
