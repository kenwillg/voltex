"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextType {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined)

const useDropdownMenu = () => {
    const context = React.useContext(DropdownMenuContext)
    if (!context) {
        throw new Error("useDropdownMenu must be used within a DropdownMenu")
    }
    return context
}

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false)
    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownMenuContext.Provider>
    )
}

const DropdownMenuTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu()

    if (asChild) {
        // If asChild is true, we clone the child and add the onClick handler
        // This is a simplified version of Slot
        const child = React.Children.only(children) as React.ReactElement

        // ensure it's a valid React element and safely access its props
        if (!React.isValidElement(child)) {
            return null
        }

        return React.cloneElement(child, {
            onClick: (e: React.MouseEvent) => {
                const originalOnClick = (child.props as any)?.onClick as
                    | ((e: React.MouseEvent) => void)
                    | undefined
                originalOnClick?.(e)
                setOpen(!open)
            },
            "aria-expanded": open,
            ...props
        })
    }

    return (
        <button
            ref={ref}
            onClick={() => setOpen(!open)}
            className={cn("inline-flex justify-center", className)}
            aria-expanded={open}
            {...props}
        >
            {children}
        </button>
    )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }
>(({ className, align = "end", children, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu()
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useImperativeHandle(ref, () => contentRef.current!)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, setOpen])

    if (!open) return null

    const alignmentClasses = {
        start: "left-0",
        end: "right-0",
        center: "left-1/2 -translate-x-1/2",
    }

    return (
        <div
            ref={contentRef}
            className={cn(
                "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                alignmentClasses[align],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; asChild?: boolean }
>(({ className, inset, asChild, children, ...props }, ref) => {
    const { setOpen } = useDropdownMenu()

    if (asChild) {
        const child = React.Children.only(children) as React.ReactElement
        if (!React.isValidElement(child)) return null

        return React.cloneElement(child, {
            ...props,
            className: cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                inset && "pl-8",
                className,
                (child.props as any).className
            ),
            onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
                const originalOnClick = (child.props as any)?.onClick
                originalOnClick?.(e)
                props.onClick?.(e)
                if (!e.defaultPrevented) {
                    setOpen(false)
                }
            }
        } as any)
    }

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                inset && "pl-8",
                className
            )}
            onClick={(e) => {
                props.onClick?.(e)
                if (!e.defaultPrevented) {
                    setOpen(false)
                }
            }}
            {...props}
        >
            {children}
        </div>
    )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "px-2 py-1.5 text-sm font-semibold",
            inset && "pl-8",
            className
        )}
        {...props}
    />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
