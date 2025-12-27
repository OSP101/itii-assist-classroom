"use client";

import { useEffect, useRef, useCallback } from "react";

interface Desk {
    id: string;
    x: number;
    y: number;
    type: "computer" | "normal" | "teacher";
    isEnabled: boolean;
    number: number;
}

interface CanvasEditorProps {
    width: number;
    height: number;
    desks: Desk[];
    gridSize: number;
    deskWidth: number;
    deskHeight: number;
    teacherDeskWidth: number;
    teacherDeskHeight: number;
    onDeskDragEnd: (deskId: string, e: { target: { x: () => number; y: () => number } }) => void;
    onDeskClick: (desk: Desk) => void;
}

export default function CanvasEditor({
    width,
    height,
    desks,
    gridSize,
    deskWidth,
    deskHeight,
    teacherDeskWidth,
    teacherDeskHeight,
    onDeskDragEnd,
    onDeskClick,
}: CanvasEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const layerRef = useRef<any>(null);

    // Store callbacks in refs to avoid re-creating stage on every render
    const onDeskDragEndRef = useRef(onDeskDragEnd);
    const onDeskClickRef = useRef(onDeskClick);
    const desksRef = useRef(desks);

    useEffect(() => {
        onDeskDragEndRef.current = onDeskDragEnd;
        onDeskClickRef.current = onDeskClick;
        desksRef.current = desks;
    }, [onDeskDragEnd, onDeskClick, desks]);

    // Initialize Konva stage
    useEffect(() => {
        if (!containerRef.current || typeof window === "undefined") return;

        let stage: any;
        let layer: any;

        const initKonva = async () => {
            const Konva = (await import("konva")).default;

            // Create stage
            stage = new Konva.Stage({
                container: containerRef.current!,
                width,
                height,
            });

            // Create layer
            layer = new Konva.Layer();
            stage.add(layer);

            stageRef.current = stage;
            layerRef.current = layer;

            // Draw initial content
            drawContent(Konva, layer);
        };

        const drawContent = (Konva: any, layer: any) => {
            layer.destroyChildren();

            // Draw grid
            const gridColor = "#e2e8f0";
            for (let i = 0; i <= width; i += gridSize) {
                layer.add(new Konva.Line({
                    points: [i, 0, i, height],
                    stroke: gridColor,
                    strokeWidth: 1,
                    listening: false,
                }));
            }
            for (let i = 0; i <= height; i += gridSize) {
                layer.add(new Konva.Line({
                    points: [0, i, width, i],
                    stroke: gridColor,
                    strokeWidth: 1,
                    listening: false,
                }));
            }

            // Draw desks
            desksRef.current.forEach((desk) => {
                const isTeacher = desk.type === "teacher";
                const currentWidth = isTeacher ? teacherDeskWidth : deskWidth;
                const currentHeight = isTeacher ? teacherDeskHeight : deskHeight;
                
                const group = new Konva.Group({
                    x: desk.x,
                    y: desk.y,
                    draggable: true,
                });

                // Get desk color based on type
                const getDeskColor = () => {
                    if (!desk.isEnabled) return "#cbd5e1";
                    switch (desk.type) {
                        case "computer": return "#3b82f6";
                        case "teacher": return "#f59e0b";
                        default: return "#10b981";
                    }
                };

                // Desk background
                const rect = new Konva.Rect({
                    width: currentWidth,
                    height: currentHeight,
                    fill: getDeskColor(),
                    cornerRadius: 8,
                    shadowColor: "black",
                    shadowBlur: 5,
                    shadowOpacity: 0.2,
                    shadowOffsetY: 2,
                });

                // Desk number text
                const text = new Konva.Text({
                    text: isTeacher ? `อาจารย์ ${desk.number}` : desk.number.toString(),
                    width: currentWidth,
                    height: currentHeight,
                    align: "center",
                    verticalAlign: "middle",
                    fontSize: isTeacher ? 14 : 16,
                    fontStyle: "bold",
                    fill: "white",
                });

                group.add(rect);
                group.add(text);

                // Events
                group.on("dragend", () => {
                    onDeskDragEndRef.current(desk.id, {
                        target: {
                            x: () => group.x(),
                            y: () => group.y(),
                        },
                    });
                });

                group.on("click tap", () => {
                    onDeskClickRef.current(desk);
                });

                // Cursor style
                group.on("mouseenter", () => {
                    if (containerRef.current) {
                        containerRef.current.style.cursor = "pointer";
                    }
                });
                group.on("mouseleave", () => {
                    if (containerRef.current) {
                        containerRef.current.style.cursor = "default";
                    }
                });

                layer.add(group);
            });

            layer.draw();
        };

        initKonva();

        return () => {
            if (stageRef.current) {
                stageRef.current.destroy();
                stageRef.current = null;
                layerRef.current = null;
            }
        };
    }, [width, height, gridSize, deskWidth, deskHeight]);

    // Update desks when they change
    useEffect(() => {
        if (!layerRef.current || typeof window === "undefined") return;

        const updateDesks = async () => {
            const Konva = (await import("konva")).default;
            const layer = layerRef.current;

            // Redraw everything
            layer.destroyChildren();

            // Draw grid
            const gridColor = "#e2e8f0";
            for (let i = 0; i <= width; i += gridSize) {
                layer.add(new Konva.Line({
                    points: [i, 0, i, height],
                    stroke: gridColor,
                    strokeWidth: 1,
                    listening: false,
                }));
            }
            for (let i = 0; i <= height; i += gridSize) {
                layer.add(new Konva.Line({
                    points: [0, i, width, i],
                    stroke: gridColor,
                    strokeWidth: 1,
                    listening: false,
                }));
            }

            // Draw desks
            desks.forEach((desk) => {
                const isTeacher = desk.type === "teacher";
                const currentWidth = isTeacher ? teacherDeskWidth : deskWidth;
                const currentHeight = isTeacher ? teacherDeskHeight : deskHeight;
                
                const group = new Konva.Group({
                    x: desk.x,
                    y: desk.y,
                    draggable: true,
                });

                // Get desk color based on type
                const getDeskColor = () => {
                    if (!desk.isEnabled) return "#cbd5e1";
                    switch (desk.type) {
                        case "computer": return "#3b82f6";
                        case "teacher": return "#f59e0b";
                        default: return "#10b981";
                    }
                };

                const rect = new Konva.Rect({
                    width: currentWidth,
                    height: currentHeight,
                    fill: getDeskColor(),
                    cornerRadius: 8,
                    shadowColor: "black",
                    shadowBlur: 5,
                    shadowOpacity: 0.2,
                    shadowOffsetY: 2,
                });

                const text = new Konva.Text({
                    text: isTeacher ? `อาจารย์ ${desk.number}` : desk.number.toString(),
                    width: currentWidth,
                    height: currentHeight,
                    align: "center",
                    verticalAlign: "middle",
                    fontSize: isTeacher ? 14 : 16,
                    fontStyle: "bold",
                    fill: "white",
                });

                group.add(rect);
                group.add(text);

                group.on("dragend", () => {
                    onDeskDragEndRef.current(desk.id, {
                        target: {
                            x: () => group.x(),
                            y: () => group.y(),
                        },
                    });
                });

                group.on("click tap", () => {
                    onDeskClickRef.current(desk);
                });

                group.on("mouseenter", () => {
                    if (containerRef.current) {
                        containerRef.current.style.cursor = "pointer";
                    }
                });
                group.on("mouseleave", () => {
                    if (containerRef.current) {
                        containerRef.current.style.cursor = "default";
                    }
                });

                layer.add(group);
            });

            layer.draw();
        };

        updateDesks();
    }, [desks, width, height, gridSize, deskWidth, deskHeight, teacherDeskWidth, teacherDeskHeight]);

    return (
        <div
            ref={containerRef}
            style={{ width, height }}
            className="bg-white"
        />
    );
}
