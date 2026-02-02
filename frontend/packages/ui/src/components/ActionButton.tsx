"use client";

import { forwardRef, type ElementType } from "react";
import {
  Eye, Pencil, Trash2, Plus, Save, X, Send, Download, Upload,
  Search, ArrowLeft, ArrowRight, ToggleRight, ToggleLeft, RefreshCw,
  Check, CheckCircle, LogOut, LogIn, Printer, Settings,
} from "lucide-react";
import { Button, type ButtonProps } from "./Button";
import { cn } from "../lib/utils";

type ActionType =
  | "view"
  | "edit"
  | "delete"
  | "create"
  | "save"
  | "cancel"
  | "send"
  | "download"
  | "upload"
  | "search"
  | "back"
  | "next"
  | "activate"
  | "deactivate"
  | "retry"
  | "confirm"
  | "change"
  | "submit"
  | "preview"
  | "logout"
  | "login"
  | "print"
  | "settings";

const actionIconMap: Record<ActionType, ElementType> = {
  view: Eye,
  edit: Pencil,
  delete: Trash2,
  create: Plus,
  save: Save,
  cancel: X,
  send: Send,
  download: Download,
  upload: Upload,
  search: Search,
  back: ArrowLeft,
  next: ArrowRight,
  activate: ToggleRight,
  deactivate: ToggleLeft,
  retry: RefreshCw,
  confirm: Check,
  change: RefreshCw,
  submit: CheckCircle,
  preview: Eye,
  logout: LogOut,
  login: LogIn,
  print: Printer,
  settings: Settings,
};

const iconSizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export interface ActionButtonProps extends ButtonProps {
  action?: ActionType;
  icon?: ElementType;
  iconPosition?: "left" | "right";
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      action,
      icon,
      iconPosition = "left",
      size = "md",
      loading,
      children,
      ...props
    },
    ref,
  ) => {
    const IconComponent = icon || (action && actionIconMap[action]);
    const iconSize = iconSizeMap[size as keyof typeof iconSizeMap] || iconSizeMap.md;

    return (
      <Button ref={ref} size={size} loading={loading} {...props}>
        {!loading && IconComponent && iconPosition === "left" && (
          <IconComponent className={cn(iconSize)} />
        )}
        {children}
        {!loading && IconComponent && iconPosition === "right" && (
          <IconComponent className={cn(iconSize)} />
        )}
      </Button>
    );
  },
);

ActionButton.displayName = "ActionButton";

export { ActionButton };
