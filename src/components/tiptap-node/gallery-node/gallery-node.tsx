"use client"

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import type { Node as PMNode } from "@tiptap/pm/model"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import type { GalleryImage } from "@/components/tiptap-node/gallery-node/gallery-node-extension"
import { CloseIcon } from "@/components/tiptap-icons/close-icon"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  DropZoneContent,
  ImageUploadDragArea,
} from "@/components/tiptap-node/image-upload-node/image-upload-node"
import type { UploadFunction } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"

function normalizeImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    const src =
      typeof (item as { src?: unknown }).src === "string"
        ? (item as { src: string }).src.trim()
        : ""

    if (!src) {
      return []
    }

    return [
      {
        src,
        alt:
          typeof (item as { alt?: unknown }).alt === "string"
            ? (item as { alt: string }).alt
            : undefined,
        title:
          typeof (item as { title?: unknown }).title === "string"
            ? (item as { title: string }).title
            : undefined,
      },
    ]
  })
}

function getImageNameFromFile(file: File) {
  return file.name.replace(/\.[^/.]+$/, "") || "unknown"
}

function normalizeImageUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  try {
    const url = new URL(trimmed)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function getImageNameFromUrl(value: string) {
  try {
    const url = new URL(value)
    const lastSegment = decodeURIComponent(
      url.pathname.split("/").filter(Boolean).at(-1) ?? ""
    )
    const filename = lastSegment.replace(/\.[^/.]+$/, "")

    return filename || "图片"
  } catch {
    return "图片"
  }
}

type PendingGalleryImage = GalleryImage | null

export const GalleryNodeView: React.FC<NodeViewProps> = (props) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageUrlError, setImageUrlError] = useState<string | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)

  const images = normalizeImages(props.node.attrs.images)
  const options = props.extension.options as {
    accept?: string
    limit?: number
    maxSize?: number
    upload?: UploadFunction
    onError?: (error: Error) => void
    onSuccess?: (url: string) => void
  }

  const accept = options.accept ?? "image/*"
  const limit = options.limit ?? 12
  const maxSize = options.maxSize ?? 0
  const upload = options.upload
  const onError = options.onError
  const onSuccess = options.onSuccess
  const remainingSlots = limit > 0 ? Math.max(limit - images.length, 0) : null
  const canAddMore = remainingSlots === null || remainingSlots > 0
  const isSelected = props.selected
  const isSingleImage = images.length === 1

  useEffect(() => {
    if (!isSelected) {
      setActiveImageIndex(null)
    }
  }, [isSelected])

  useEffect(() => {
    if (activeImageIndex === null) {
      return
    }

    if (images.length === 0) {
      setActiveImageIndex(null)
      return
    }

    if (activeImageIndex >= images.length) {
      setActiveImageIndex(images.length - 1)
    }
  }, [activeImageIndex, images.length])

  const updateImages = (nextImages: GalleryImage[]) => {
    const pos = props.getPos()

    if (typeof pos !== "number") {
      return false
    }

    const currentNode = props.editor.state.doc.nodeAt(pos) as PMNode | null

    if (!currentNode || currentNode.type.name !== "gallery") {
      return false
    }

    return props.editor
      .chain()
      .focus()
      .command(({ tr }) => {
        if (nextImages.length === 0) {
          tr.deleteRange(pos, pos + currentNode.nodeSize)
          return true
        }

        tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          images: nextImages,
        })
        return true
      })
      .run()
  }

  const appendImages = (nextImages: GalleryImage[]) => {
    return updateImages([...images, ...nextImages])
  }

  const removeImageAt = (index: number) => {
    if (index < 0 || index >= images.length) {
      return false
    }

    const nextActiveImageIndex =
      activeImageIndex === null
        ? null
        : images.length <= 1
          ? null
          : activeImageIndex > index
            ? activeImageIndex - 1
            : activeImageIndex === index
              ? Math.min(index, images.length - 2)
              : activeImageIndex

    const success = updateImages(images.filter((_, currentIndex) => currentIndex !== index))

    if (success) {
      setActiveImageIndex(nextActiveImageIndex)
    }

    return success
  }

  const handleImageUrlInsert = () => {
    if (!canAddMore) {
      if (typeof limit === "number" && limit > 0) {
        setImageUrlError(`最多只能添加 ${limit} 张图片。`)
      }
      return
    }

    const normalizedUrl = normalizeImageUrl(imageUrl)

    if (!normalizedUrl) {
      setImageUrlError("请输入有效的图片 URL。")
      return
    }

    const filename = getImageNameFromUrl(normalizedUrl)
    const success = appendImages([
      {
        src: normalizedUrl,
        alt: filename,
        title: filename,
      },
    ])

    if (success) {
      setImageUrl("")
      setImageUrlError(null)
    }
  }

  const handleFiles = async (files: File[]) => {
    if (!upload) {
      onError?.(new Error("Upload function is not defined"))
      return
    }

    const selectedFiles =
      remainingSlots === null ? files : files.slice(0, remainingSlots)

    if (selectedFiles.length === 0) {
      if (typeof limit === "number" && limit > 0) {
        onError?.(new Error(`Maximum ${limit} files allowed`))
      }
      return
    }

    setIsUploading(true)

    try {
      const uploadedImages = (
        await Promise.all(
          selectedFiles.map(async (file): Promise<PendingGalleryImage> => {
            if (maxSize > 0 && file.size > maxSize) {
              onError?.(
                new Error(`File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`)
              )
              return null
            }

            try {
              const url = await upload(file, () => undefined, new AbortController().signal)

              if (!url) {
                throw new Error("Upload failed: No URL returned")
              }

              onSuccess?.(url)

              const filename = getImageNameFromFile(file)
              return {
                src: url,
                alt: filename,
                title: filename,
              }
            } catch (error) {
              onError?.(error instanceof Error ? error : new Error("Upload failed"))
              return null
            }
          })
        )
      ).filter((image): image is Exclude<PendingGalleryImage, null> => image !== null)

      if (uploadedImages.length > 0) {
        appendImages(uploadedImages)
      }
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`content-gallery content-gallery--editor${isSingleImage ? " content-gallery--single" : ""}`}
      data-type="gallery"
      data-gallery-root="true"
      data-image-viewer-disabled="true"
      aria-label="图册"
      tabIndex={0}
      onClickCapture={(event: ReactMouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null

        if (!target) {
          return
        }

        if (target.closest("[data-gallery-item]")) {
          return
        }

        if (target.closest(".content-gallery__add-panel")) {
          return
        }

        setActiveImageIndex(null)
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (activeImageIndex === null) {
          return
        }

        if (event.key !== "Backspace" && event.key !== "Delete") {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        removeImageAt(activeImageIndex)
      }}
    >
      <div
        className={`content-gallery__track${isSingleImage ? " content-gallery__track--single" : ""}`}
      >
        {images.map((image, index) => (
          <figure
            key={`${image.src}-${index}`}
            className={`content-gallery__item${activeImageIndex === index ? " content-gallery__item--active" : ""}`}
            data-gallery-item={`${index + 1}`}
            data-gallery-item-active={activeImageIndex === index ? "true" : "false"}
            onClick={() => {
              if (!isSelected) {
                setActiveImageIndex(null)
                wrapperRef.current?.focus()
                return
              }

              setActiveImageIndex((currentIndex) =>
                currentIndex === index ? null : index
              )
              wrapperRef.current?.focus()
            }}
          >
            <Button
              type="button"
              variant="ghost"
              className="content-gallery__remove-button"
              aria-label={`删除第 ${index + 1} 张图片`}
              showTooltip={false}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                removeImageAt(index)
              }}
            >
              <CloseIcon className="tiptap-button-icon" />
            </Button>
            <img
              src={image.src}
              alt={image.alt ?? image.title ?? `图册图片 ${index + 1}`}
              title={image.title ?? image.alt ?? `图册图片 ${index + 1}`}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>

      {isSelected ? (
        <div
          className="content-gallery__add-panel tiptap-image-upload"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="tiptap-image-upload-empty">
            <ImageUploadDragArea
              onFile={(files) => {
                if (!canAddMore || isUploading) {
                  return
                }

                void handleFiles(files)
              }}
            >
              <div
                className="content-gallery__upload-surface"
                role="button"
                tabIndex={0}
                aria-label={isUploading ? "上传中" : "添加图片到图册"}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()

                  if (!canAddMore || isUploading) {
                    return
                  }

                  inputRef.current?.click()
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return
                  }

                  event.preventDefault()
                  event.stopPropagation()

                  if (!canAddMore || isUploading) {
                    return
                  }

                  inputRef.current?.click()
                }}
              >
                <DropZoneContent maxSize={maxSize} limit={remainingSlots ?? limit} />
              </div>
            </ImageUploadDragArea>

            <div className="tiptap-image-upload-url">
              <div className="tiptap-image-upload-url-divider">
                <span>或粘贴已上传图片 URL</span>
              </div>
              <div className="tiptap-image-upload-url-row">
                <input
                  type="url"
                  value={imageUrl}
                  disabled={isUploading}
                  placeholder="https://img.example.com/uploads/image.webp"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    setImageUrl(event.target.value)
                    setImageUrlError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleImageUrlInsert()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isUploading || !canAddMore || !imageUrl.trim()}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleImageUrlInsert()
                  }}
                >
                  插入
                </Button>
              </div>
              {imageUrlError ? (
                <div className="tiptap-image-upload-url-error">{imageUrlError}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        hidden
        type="file"
        accept={accept}
        multiple={remainingSlots === null || remainingSlots > 1}
        onClick={(event) => {
          event.stopPropagation()
          const target = event.currentTarget
          target.value = ""
        }}
        onChange={(event) => {
          event.stopPropagation()
          const files = event.target.files

          if (!files || files.length === 0) {
            return
          }

          void handleFiles(Array.from(files))
        }}
      />
    </NodeViewWrapper>
  )
}

export default GalleryNodeView
