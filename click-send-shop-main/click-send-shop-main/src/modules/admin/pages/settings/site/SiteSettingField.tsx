import { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import type { SiteSettings } from "@/types/admin";
import type { SiteSettingFieldDef } from "./siteSettingsSections";
import SettingSwitch from "./SettingSwitch";
import SiteImageUploadField from "./SiteImageUploadField";

type Props = {
  field: SiteSettingFieldDef;
  value: string;
  onChange: (key: keyof SiteSettings, value: string) => void;
  uploadingKey: string | null;
  onUploadImage: (key: keyof SiteSettings, file: File) => void;
};

export default function SiteSettingField({ field, value, onChange, uploadingKey, onUploadImage }: Props) {
  const id = `site-field-${String(field.key)}`;

  if (field.type === "custom") return null;

  if (field.type === "switch") {
    return (
      <SettingSwitch
        id={id}
        label={field.label}
        hint={field.hint}
        checked={value === "1"}
        onCheckedChange={(checked) => onChange(field.key, checked ? "1" : "0")}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <AdminLabelWithHint htmlFor={id} label={field.label} hint={field.hint} />
        <textarea
          id={id}
          rows={field.rows ?? 2}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <AdminLabelWithHint htmlFor={id} label={field.label} hint={field.hint} />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <SiteImageUploadField
        fieldKey={field.key}
        label={field.label}
        hint={field.hint}
        value={value}
        isUploading={uploadingKey === String(field.key)}
        onChange={(v) => onChange(field.key, v)}
        onUpload={(f) => onUploadImage(field.key, f)}
      />
    );
  }

  return (
    <div>
      <AdminLabelWithHint htmlFor={id} label={field.label} hint={field.hint} />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold"
      />
    </div>
  );
}
