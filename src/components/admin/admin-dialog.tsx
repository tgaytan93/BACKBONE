import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

// Module-level stable reference. Used as the default for `initialData` so the
// effect dep array doesn't see a new object every render (which would trigger
// "Maximum update depth exceeded").
const EMPTY_INITIAL_DATA: Record<string, unknown> = {};

export interface AdminFormField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'textarea'
    | 'checkbox'
    | 'select';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: unknown;
  disabled?: boolean;
  rows?: number;
  validation?: (value: unknown) => string | null;
}

interface AdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: AdminFormField[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Record<string, unknown>;
  isEditMode?: boolean;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

export function AdminDialog({
  isOpen,
  onClose,
  title,
  description,
  fields,
  onSave,
  initialData = EMPTY_INITIAL_DATA,
  isEditMode = false,
  submitButtonText,
  isSubmitting = false,
}: AdminDialogProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const defaultFormData: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (initialData[field.key] !== undefined) {
          defaultFormData[field.key] = initialData[field.key];
        } else if (field.defaultValue !== undefined) {
          defaultFormData[field.key] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          defaultFormData[field.key] = false;
        } else if (field.type === 'number') {
          defaultFormData[field.key] = 0;
        } else {
          defaultFormData[field.key] = '';
        }
      });
      setFormData(defaultFormData);
      setErrors({});
    }
  }, [isOpen, fields, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[field.key];

      if (field.required) {
        if (value === undefined || value === null || value === '') {
          newErrors[field.key] = `${field.label} is required`;
          return;
        }
      }

      if (
        field.validation &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        const validationError = field.validation(value);
        if (validationError) {
          newErrors[field.key] = validationError;
          return;
        }
      }

      if (
        field.type === 'number' &&
        value !== '' &&
        value !== null &&
        value !== undefined
      ) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.key] = `${field.label} must be a valid number`;
          return;
        }
        if (field.min !== undefined && numValue < field.min) {
          newErrors[field.key] = `${field.label} must be at least ${field.min}`;
          return;
        }
        if (field.max !== undefined && numValue > field.max) {
          newErrors[field.key] = `${field.label} must be at most ${field.max}`;
          return;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: AdminFormField, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field.key]: value,
    }));

    if (errors[field.key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field.key];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setInternalSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setInternalSubmitting(false);
    }
  };

  const renderField = (field: AdminFormField) => {
    const hasError = !!errors[field.key];
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.key}
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleInputChange(field, e.target.value)}
            disabled={field.disabled}
            rows={field.rows || 3}
            className={hasError ? 'border-red-500' : ''}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.key}
              checked={!!value}
              onCheckedChange={(checked) => handleInputChange(field, checked)}
              disabled={field.disabled}
            />
            <Label htmlFor={field.key} className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        );

      case 'select':
        return (
          <Select
            value={value?.toString() || ''}
            onValueChange={(newValue) => handleInputChange(field, newValue)}
            disabled={field.disabled}
          >
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue
                placeholder={field.placeholder || `Select ${field.label}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={field.key}
            type={field.type}
            placeholder={field.placeholder}
            value={value as string | number}
            onChange={(e) => {
              const newValue =
                field.type === 'number'
                  ? e.target.value === ''
                    ? ''
                    : Number(e.target.value)
                  : e.target.value;
              handleInputChange(field, newValue);
            }}
            disabled={field.disabled}
            min={field.min}
            max={field.max}
            className={hasError ? 'border-red-500' : ''}
          />
        );
    }
  };

  const submitting = isSubmitting || internalSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                {field.type !== 'checkbox' && (
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                )}

                {renderField(field)}

                {field.description && (
                  <p className="text-xs text-muted-foreground/60">
                    {field.description}
                  </p>
                )}

                {errors[field.key] && (
                  <p className="text-xs text-red-500">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/80 text-black"
            >
              {submitting && <Spinner size="sm" className="mr-2" />}
              {submitButtonText || (isEditMode ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
