"use client";

import { useCallback, useEffect, useMemo, useState, type PointerEvent, type WheelEvent } from "react";

type ViewerImage = {
  src: string;
  alt: string;
};

type ViewerState = {
  images: ViewerImage[];
  index: number;
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
};

const IMAGE_SELECTOR = ".reading-copy img, .simple-editor-content .tiptap.ProseMirror img";
const MIN_ZOOM = 0.25;
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const GALLERY_SELECTOR = "[data-gallery-root]";
const IMAGE_VIEWER_DISABLED_SELECTOR = "[data-image-viewer-disabled]";

export function ImageViewerController() {
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<PanState | null>(null);
  const currentImage = viewer?.images[viewer.index] ?? null;
  const hasMultipleImages = (viewer?.images.length ?? 0) > 1;
  const effectiveOffset = zoom > DEFAULT_ZOOM ? offset : { x: 0, y: 0 };

  const resetTransform = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setOffset({ x: 0, y: 0 });
    setPanState(null);
  }, []);

  const setConstrainedZoom = useCallback((nextZoom: number) => {
    const constrainedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    setZoom(constrainedZoom);

    if (constrainedZoom <= DEFAULT_ZOOM) {
      setOffset({ x: 0, y: 0 });
      setPanState(null);
    }
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setConstrainedZoom(zoom + delta);
  }, [setConstrainedZoom, zoom]);

  const moveCurrentViewer = useCallback(
    (direction: -1 | 1) => {
      resetTransform();
      setViewer((current) => moveViewer(current, direction));
    },
    [resetTransform],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const image = (event.target as Element | null)?.closest<HTMLImageElement>(IMAGE_SELECTOR);

      if (
        !image?.src ||
        image.closest("[data-image-viewer]") ||
        image.closest(IMAGE_VIEWER_DISABLED_SELECTOR)
      ) {
        return;
      }

      const galleryRoot = image.closest<HTMLElement>(GALLERY_SELECTOR);
      const imageScope = galleryRoot ?? image.closest<HTMLElement>(".reading-copy, .simple-editor-content");
      const imageElements = Array.from(
        imageScope?.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR) ?? [image],
      ).filter((item) => Boolean(item.src));
      const images = imageElements.map((item) => ({
        src: item.currentSrc || item.src,
        alt: item.alt || item.title || "图片",
      }));
      const index = Math.max(0, imageElements.indexOf(image));

      event.preventDefault();
      event.stopPropagation();
      resetTransform();
      setViewer({ images, index });
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [resetTransform]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewer(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        moveCurrentViewer(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        moveCurrentViewer(1);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-ZOOM_STEP);
        return;
      }

      if (event.key === "0") {
        resetTransform();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [moveCurrentViewer, resetTransform, viewer, zoomBy]);

  const imageCounter = useMemo(() => {
    if (!viewer || viewer.images.length < 2) {
      return null;
    }

    return `${viewer.index + 1} / ${viewer.images.length}`;
  }, [viewer]);

  if (!viewer || !currentImage) {
    return null;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setConstrainedZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    event.stopPropagation();

    if (zoom <= DEFAULT_ZOOM) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLImageElement>) {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    setOffset({
      x: panState.offsetX + event.clientX - panState.startX,
      y: panState.offsetY + event.clientY - panState.startY,
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLImageElement>) {
    if (panState?.pointerId === event.pointerId) {
      event.stopPropagation();
      setPanState(null);
    }
  }

  return (
    <div
      data-image-viewer
      className="image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="图片查看器"
      onClick={() => setViewer(null)}
    >
      <div className="image-viewer__stage" onWheel={handleWheel}>
        <button
          type="button"
          className="image-viewer__close"
          aria-label="关闭图片"
          onClick={() => setViewer(null)}
        >
          ×
        </button>
        <div className="image-viewer__toolbar" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="image-viewer__tool"
            aria-label="缩小图片"
            onClick={() => zoomBy(-ZOOM_STEP)}
          >
            −
          </button>
          <button
            type="button"
            className="image-viewer__tool image-viewer__tool--label"
            aria-label="重置图片大小"
            onClick={resetTransform}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="image-viewer__tool"
            aria-label="放大图片"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            +
          </button>
        </div>
        {hasMultipleImages ? (
          <button
            type="button"
            className="image-viewer__nav image-viewer__nav--prev"
            aria-label="上一张图片"
            onClick={(event) => {
              event.stopPropagation();
              moveCurrentViewer(-1);
            }}
          >
            ‹
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          draggable={false}
          className="image-viewer__image"
          style={{
            transform: `translate3d(${effectiveOffset.x}px, ${effectiveOffset.y}px, 0) scale(${zoom})`,
            cursor: zoom > DEFAULT_ZOOM ? (panState ? "grabbing" : "grab") : "default",
          }}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (zoom === DEFAULT_ZOOM) {
              setConstrainedZoom(2);
            } else {
              resetTransform();
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(event) => event.preventDefault()}
        />
        {hasMultipleImages ? (
          <button
            type="button"
            className="image-viewer__nav image-viewer__nav--next"
            aria-label="下一张图片"
            onClick={(event) => {
              event.stopPropagation();
              moveCurrentViewer(1);
            }}
          >
            ›
          </button>
        ) : null}
        {imageCounter ? <div className="image-viewer__counter">{imageCounter}</div> : null}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveViewer(current: ViewerState | null, direction: -1 | 1) {
  if (!current || current.images.length === 0) {
    return current;
  }

  const nextIndex = (current.index + direction + current.images.length) % current.images.length;

  return {
    ...current,
    index: nextIndex,
  };
}
