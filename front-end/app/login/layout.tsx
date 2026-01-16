import "@/styles/globals.css";
import { Providers } from "../providers";
import { fontSans } from "@/config/fonts";
import clsx from "clsx";

export const metadata = {
  title: "เข้าสู่ระบบ - ITII Assist Classroom",
  description: "เข้าสู่ระบบ ITII Assist Classroom",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
return <>{children}</>;
}
