import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ค้นหาคะแนนรายบุคคล - ITII Assist Classroom",
  description: "ตรวจสอบคะแนนเก็บและความคืบหน้าการเรียนของคุณได้ทันที",
};

  export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }

export default function MyscoreViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
