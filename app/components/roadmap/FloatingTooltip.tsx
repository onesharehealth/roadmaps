import React, { useRef, useState } from 'react'
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'

import { cn } from '~/lib/utils'

type FloatingTooltipProps = {
  children: React.ReactElement<{ ref?: React.Ref<HTMLElement> }>
  content: React.ReactNode
  enabled?: boolean
  placement?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: number | string
  className?: string
}

function toCssSize(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value
}

export function FloatingTooltip({
  children,
  content,
  enabled = true,
  placement = 'top',
  maxWidth = 240,
  className,
}: FloatingTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const arrowRef = useRef(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && enabled,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(10), flip(), shift(), arrow({ element: arrowRef })],
  })

  const hover = useHover(context)
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])

  const child = React.cloneElement(children, {
    ref: refs.setReference,
    ...getReferenceProps(children.props as Record<string, unknown>),
  })

  return (
    <>
      {child}
      {isOpen && enabled && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              maxWidth: toCssSize(maxWidth),
            }}
            {...getFloatingProps()}
            className={cn(
              'pointer-events-none z-50 w-max text-balance rounded-md bg-foreground px-3 py-1.5 text-center text-xs text-background shadow-md',
              className,
            )}
          >
            {' '}
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-foreground"
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
