import { Metadata } from "next";

export const metadata: Metadata = {
  title: "สร้างรายวิชาใหม่",
  description: "สร้างรายวิชาใหม่สำหรับการเรียนการสอน",
};

export default function CreateCourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
