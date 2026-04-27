import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ImagesIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M5 7.25C5 6.00736 6.00736 5 7.25 5H17.75C18.9926 5 20 6.00736 20 7.25V17.75C20 18.9926 18.9926 20 17.75 20H7.25C6.00736 20 5 18.9926 5 17.75V7.25Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 16.75H3.75C2.7835 16.75 2 15.9665 2 15V4.25C2 3.00736 3.00736 2 4.25 2H15C15.9665 2 16.75 2.7835 16.75 3.75V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 16.75L11.1464 14.1036C11.3417 13.9083 11.6583 13.9083 11.8536 14.1036L13.25 15.5L15.3964 13.3536C15.5917 13.1583 15.9083 13.1583 16.1036 13.3536L18.5 15.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 9.75H9.7625"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
})

ImagesIcon.displayName = "ImagesIcon"
