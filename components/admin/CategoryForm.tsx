'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { CategorySelect } from './CategorySelect'
import type { Category } from '@/types'

const categorySchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  parent: z.number().nullable().optional(),
  display_order: z.number().optional(),
  is_active: z.boolean().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  category?: Category
  categories?: Category[]
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({
  category,
  categories = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      parent: category?.parent || null,
      display_order: category?.display_order || 0,
      is_active: category?.is_active ?? true,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Input
          label="نام دسته‌بندی"
          {...register('name')}
          error={errors.name?.message}
          required
        />
      </div>

      <Controller
        name="parent"
        control={control}
        render={({ field, fieldState }) => (
          <CategorySelect
            categories={Array.isArray(categories) ? categories : []}
            value={field.value ?? null}
            onChange={field.onChange}
            placeholder="بدون دسته والد"
            label="دسته والد (اختیاری)"
            error={fieldState.error?.message}
            excludeIds={category?.id ? [category.id] : []}
          />
        )}
      />

      <div>
        <Input
          label="ترتیب نمایش"
          type="number"
          {...register('display_order', { valueAsNumber: true })}
          error={errors.display_order?.message}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          {...register('is_active')}
          className="w-5 h-5 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
        />
        <label
          htmlFor="is_active"
          className="text-sm font-medium text-text dark:text-text-dark"
        >
          فعال
        </label>
      </div>

      <div className="flex gap-4">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {category ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  )
}

