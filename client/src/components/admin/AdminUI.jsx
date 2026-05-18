import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Search, Sparkles } from "lucide-react";

export function AdminPageHeader({ eyebrow, title, description, action, className, titleClassName }) {
  return (
    <div className={cn("page-heading", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            {eyebrow}
          </span>
        )}
        <h1 className={cn("text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl", titleClassName)}>{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}

export function AdminStatCard({ title, value, description, icon: Icon, color = "text-primary", tone = "bg-primary/10" }) {
  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn("rounded-2xl p-3 shadow-sm ring-1 ring-white/70", tone)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold tracking-tight", color)}>{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminToolbar({ children, className, contentClassName }) {
  return (
    <Card className={cn("soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6", className)}>
      <CardContent className={cn("flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function AdminSearchBox({ value, onChange, placeholder = "Tìm kiếm...", className }) {
  return (
    <div className={cn("relative w-full sm:max-w-md", className)}>
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="field-input h-11 rounded-xl pl-10"
      />
    </div>
  );
}

export function AdminEmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {Icon ? <Icon className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
        </div>
        <p className="text-lg font-medium">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

export function AdminLoadingState({ label = "Đang tải dữ liệu..." }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/10 bg-white shadow-lg shadow-cyan-950/8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function AdminActionButton({ children, icon: Icon, ...props }) {
  return (
    <Button {...props}>
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}
