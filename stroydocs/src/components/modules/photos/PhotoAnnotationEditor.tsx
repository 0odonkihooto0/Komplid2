'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, Square, Type, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotoAnnotations } from './usePhotoAnnotations';

type ToolType = 'arrow' | 'rectangle' | 'text';

interface Props {
  photoId: string;
  imageUrl: string;
  initialAnnotations?: unknown;
  onClose: () => void;
}

export function PhotoAnnotationEditor({ photoId, imageUrl, initialAnnotations, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricCanvasRef = useRef<any>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('arrow');
  const [isReady, setIsReady] = useState(false);
  const { saveAnnotations, isSaving } = usePhotoAnnotations();

  const initCanvas = useCallback(async () => {
    if (!canvasRef.current) return;

    const fabric = await import('fabric');
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      selection: true,
    });

    // Загружаем фото как фон
    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
    const scale = Math.min(800 / (img.width || 800), 600 / (img.height || 600));
    canvas.width = (img.width || 800) * scale;
    canvas.height = (img.height || 600) * scale;
    canvas.backgroundImage = img;
    img.scaleX = scale;
    img.scaleY = scale;
    canvas.renderAll();

    // Восстанавливаем аннотации, если есть
    if (initialAnnotations && typeof initialAnnotations === 'object') {
      try {
        await canvas.loadFromJSON(initialAnnotations);
        // Восстанавливаем фон после загрузки JSON
        canvas.backgroundImage = img;
        canvas.renderAll();
      } catch {
        // Если не удалось загрузить — начинаем с чистого холста
      }
    }

    fabricCanvasRef.current = canvas;
    setIsReady(true);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, initialAnnotations]);

  useEffect(() => {
    initCanvas();
    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, [initCanvas]);

  const addArrow = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const fabric = await import('fabric');

    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: '#FF0000',
      strokeWidth: 3,
      selectable: true,
    });
    // Наконечник стрелки
    const triangle = new fabric.Triangle({
      width: 15,
      height: 15,
      fill: '#FF0000',
      left: 200,
      top: 42,
      angle: 90,
      selectable: true,
    });

    const group = new fabric.Group([line, triangle], {
      left: 100,
      top: 100,
      selectable: true,
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, []);

  const addRectangle = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const fabric = await import('fabric');

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: 'transparent',
      stroke: '#FF0000',
      strokeWidth: 3,
      selectable: true,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }, []);

  const addText = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const fabric = await import('fabric');

    const text = new fabric.IText('Текст', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#FF0000',
      fontFamily: 'Arial',
      selectable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, []);

  const handleToolClick = (tool: ToolType) => {
    setActiveTool(tool);
    if (tool === 'arrow') addArrow();
    else if (tool === 'rectangle') addRectangle();
    else if (tool === 'text') addText();
  };

  const handleSave = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    saveAnnotations({ photoId, annotations: json });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Панель инструментов */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={activeTool === 'arrow' ? 'default' : 'outline'}
          onClick={() => handleToolClick('arrow')}
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          Стрелка
        </Button>
        <Button
          size="sm"
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          onClick={() => handleToolClick('rectangle')}
        >
          <Square className="h-4 w-4 mr-1" />
          Прямоугольник
        </Button>
        <Button
          size="sm"
          variant={activeTool === 'text' ? 'default' : 'outline'}
          onClick={() => handleToolClick('text')}
        >
          <Type className="h-4 w-4 mr-1" />
          Текст
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={handleSave} disabled={!isReady || isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Канвас */}
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
