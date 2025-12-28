import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ห้องเรียน",
  description: "ดูข้อมูลห้องเรียนและจัดการโต๊ะเรียน",
};

export default function ClassroomViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
