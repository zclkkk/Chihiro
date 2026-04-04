"use client";

import { forwardRef, type CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import dayPickerStyles from "react-day-picker/style.module.css";

type PublishedAtFieldProps = {
  defaultValue?: string | null;
};

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

export function PublishedAtField({ defaultValue }: PublishedAtFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState(() => getInitialDateParts(defaultValue));

  const value = composeDateTimeValue(parts);
  const selectedDate = useMemo(() => parseDateTimeString(value), [value]);
  const selectedDateTime = selectedDate?.getTime() ?? null;
  const [month, setMonth] = useState<Date>(() => selectedDate ?? new Date());
  const [monthOptions, yearOptions] = useMemo(() => {
    const todayYear = new Date().getFullYear();
    const yearRange = Array.from({ length: 61 }, (_, index) => todayYear - 50 + index);
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2026, index, 1);
      return {
        value: index + 1,
        label: new Intl.DateTimeFormat("zh-CN", { month: "long" }).format(date),
      };
    });

    return [months, yearRange];
  }, []);
  const monthAnchor = useMemo(() => getMonthAnchor(parts.year, parts.month), [
    parts.year,
    parts.month,
  ]);

  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
    }
  }, [selectedDateTime]);

  useEffect(() => {
    if (monthAnchor) {
      setMonth(monthAnchor);
    }
  }, [monthAnchor?.getTime()]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-1 text-sm text-zinc-700 dark:text-zinc-200">
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <div className="flex min-w-0 flex-1 items-center gap-0 text-sm text-zinc-700 dark:text-zinc-200">
          <DateSegmentInput
            ref={yearRef}
            label="年"
            value={parts.year}
            placeholder="YYYY"
            maxLength={4}
            inputMode="numeric"
            className="w-[4ch]"
            onFocus={() => setOpen(true)}
            onChange={(nextYear) => {
              setParts((current) => normalizeDateTimeParts({ ...current, year: nextYear }));
            }}
            onComplete={() => {
              monthRef.current?.focus();
            }}
            onTabToNext={() => {
              monthRef.current?.focus();
            }}
            onArrowDown={() => setOpen(true)}
            onEscape={() => setOpen(false)}
          />
          <span className="shrink-0 mx-0 text-zinc-300 dark:text-zinc-700">-</span>
          <DateSegmentInput
            ref={monthRef}
            label="月"
            value={parts.month}
            placeholder="MM"
            maxLength={2}
            inputMode="numeric"
            className="w-[2ch]"
            onFocus={() => setOpen(true)}
            onChange={(nextMonth) => {
              setParts((current) => normalizeDateTimeParts({ ...current, month: nextMonth }));
            }}
            onComplete={() => {
              dayRef.current?.focus();
            }}
            onTabToNext={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, month: currentValue }, true),
              );
              dayRef.current?.focus();
            }}
            onArrowDown={() => setOpen(true)}
            onEscape={() => setOpen(false)}
            onBlur={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, month: currentValue }, true),
              );
            }}
          />
          <span className="shrink-0 mx-0 text-zinc-300 dark:text-zinc-700">-</span>
          <DateSegmentInput
            ref={dayRef}
            label="日"
            value={parts.day}
            placeholder="DD"
            maxLength={2}
            inputMode="numeric"
            className="w-[2ch]"
            onFocus={() => setOpen(true)}
            onChange={(nextDay) => {
              setParts((current) => normalizeDateTimeParts({ ...current, day: nextDay }));
            }}
            onComplete={() => {
              hourRef.current?.focus();
            }}
            onTabToNext={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, day: currentValue }, true),
              );
              hourRef.current?.focus();
            }}
            onArrowDown={() => setOpen(true)}
            onEscape={() => setOpen(false)}
            onBlur={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, day: currentValue }, true),
              );
            }}
          />
          <span aria-hidden="true" className="shrink-0 w-3" />
          <DateSegmentInput
            ref={hourRef}
            label="时"
            value={parts.hour}
            placeholder="HH"
            maxLength={2}
            inputMode="numeric"
            className="w-[2ch]"
            onFocus={() => setOpen(true)}
            onChange={(nextHour) => {
              setParts((current) => normalizeDateTimeParts({ ...current, hour: nextHour }));
            }}
            onComplete={() => {
              minuteRef.current?.focus();
            }}
            onTabToNext={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, hour: currentValue }, true),
              );
              minuteRef.current?.focus();
            }}
            onArrowDown={() => setOpen(true)}
            onEscape={() => setOpen(false)}
            onBlur={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, hour: currentValue }, true),
              );
            }}
          />
          <span className="shrink-0 mx-0 text-zinc-300 dark:text-zinc-700">:</span>
          <DateSegmentInput
            ref={minuteRef}
            label="分"
            value={parts.minute}
            placeholder="MM"
            maxLength={2}
            inputMode="numeric"
            className="w-[2ch]"
            onFocus={() => setOpen(true)}
            onChange={(nextMinute) => {
              setParts((current) => normalizeDateTimeParts({ ...current, minute: nextMinute }));
            }}
            onArrowDown={() => setOpen(true)}
            onEscape={() => setOpen(false)}
            onBlur={(currentValue) => {
              setParts((current) =>
                normalizeDateTimeParts({ ...current, minute: currentValue }, true),
              );
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="切换日期选择器"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.75rem)] z-30 flex w-fit flex-col items-start rounded-3xl border border-zinc-200/80 bg-white/95 p-2.5 shadow-[0_24px_64px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95">
          <CalendarToolbar
            month={month}
            yearOptions={yearOptions}
            monthOptions={monthOptions}
            onMonthChange={setMonth}
          />
          <DayPicker
            mode="single"
            locale={zhCN}
            captionLayout="label"
            navLayout="after"
            showOutsideDays
            fixedWeeks
            startMonth={new Date(yearOptions[0], 0)}
            endMonth={new Date(yearOptions[yearOptions.length - 1], 11)}
            month={month}
            selected={selectedDate ?? undefined}
            onMonthChange={setMonth}
            onSelect={(next) => {
              if (!next) {
                return;
              }

              setParts((current) => ({
                ...current,
                year: String(next.getFullYear()),
                month: String(next.getMonth() + 1).padStart(2, "0"),
                day: String(next.getDate()).padStart(2, "0"),
                hour: current.hour || String(new Date().getHours()).padStart(2, "0"),
                minute: current.minute || String(new Date().getMinutes()).padStart(2, "0"),
              }));
              setMonth(next);
              setOpen(false);
              window.requestAnimationFrame(() => {
                yearRef.current?.focus();
              });
            }}
            style={
              {
                "--rdp-accent-color": "var(--primary)",
                "--rdp-accent-background-color": "rgb(var(--primary-rgb) / 0.12)",
                "--rdp-selected-border": "none",
                "--rdp-day-height": "30px",
                "--rdp-day-width": "30px",
                "--rdp-day_button-height": "28px",
                "--rdp-day_button-width": "28px",
                "--rdp-nav-height": "2rem",
                "--rdp-weekday-padding": "0.25rem 0",
                "--rdp-dropdown-gap": "0.25rem",
            } as CSSProperties
            }
            classNames={{
              root: `${dayPickerStyles.root} mx-auto text-zinc-700 dark:text-zinc-200`,
              months: `${dayPickerStyles.months} flex flex-col items-start gap-2`,
              month: "w-full space-y-1.5",
              month_caption: `${dayPickerStyles.month_caption} flex w-full items-center justify-between gap-4 px-1`,
              dropdowns: `${dayPickerStyles.dropdowns} flex items-center justify-start gap-1.5`,
              dropdown_root: `${dayPickerStyles.dropdown_root} relative min-w-[4.5rem] rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 text-xs text-zinc-700 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-200`,
              dropdown:
                `${dayPickerStyles.dropdown} absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent px-0 opacity-0 outline-none dark:text-zinc-200`,
              nav: `${dayPickerStyles.nav} ml-auto flex items-center gap-1`,
              weeks: "space-y-0",
              button_previous:
                `${dayPickerStyles.button_previous} inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100`,
              button_next:
                `${dayPickerStyles.button_next} inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100`,
              chevron: `${dayPickerStyles.chevron} ml-1 h-3.5 w-3.5 shrink-0 fill-current`,
              caption_label:
                `${dayPickerStyles.caption_label} inline-flex items-center gap-1 whitespace-nowrap pr-1 text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-50`,
              weekdays: "mx-auto grid w-fit grid-cols-7",
              weekday:
                `${dayPickerStyles.weekday} h-7 w-7 rounded-full text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500`,
              month_grid: `${dayPickerStyles.month_grid} mx-auto w-fit border-collapse border-spacing-0`,
              week: "grid grid-cols-7 gap-y-0",
              day: `${dayPickerStyles.day} p-0`,
              day_button:
                `${dayPickerStyles.day_button} inline-flex !h-[1.625rem] !w-[1.625rem] items-center justify-center rounded-full text-[11px] font-medium transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:hover:bg-white/5 dark:focus-visible:ring-sky-300/20`,
              selected:
                `${dayPickerStyles.selected} !h-[1.625rem] !w-[1.625rem] rounded-full bg-primary !text-white font-semibold text-[11px] shadow-sm hover:bg-primary dark:bg-sky-300 dark:!text-zinc-950 dark:hover:bg-sky-300`,
              today: `${dayPickerStyles.today} text-primary font-semibold dark:text-sky-300`,
              outside: `${dayPickerStyles.outside} text-zinc-300 dark:text-zinc-700`,
              disabled: `${dayPickerStyles.disabled} cursor-not-allowed opacity-30`,
              hidden: dayPickerStyles.hidden,
            }}
            hideNavigation
            components={{
              MonthCaption: EmptyMonthCaption,
              Nav: EmptyNav,
            }}
          />
          <div className="mt-3 w-full border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
            <div className="flex items-center justify-center gap-2">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                时间
              </span>
              <div className="flex items-center gap-1.5">
                <TimeStepper
                  label="时"
                  value={parts.hour}
                  onChange={(nextHour) => {
                    setParts((current) =>
                      normalizeDateTimeParts({ ...current, hour: nextHour }, true),
                    );
                  }}
                  min={0}
                  max={23}
                  onStep={(delta) => {
                    setParts((current) => {
                      const normalized = normalizeDateTimeParts(current, true);
                      return {
                        ...normalized,
                        hour: String(
                          clampNumber(Number(normalized.hour) + delta, 0, 23),
                        ).padStart(2, "0"),
                      };
                    });
                  }}
                />
                <span className="shrink-0 text-zinc-300 dark:text-zinc-700">:</span>
                <TimeStepper
                  label="分"
                  value={parts.minute}
                  onChange={(nextMinute) => {
                    setParts((current) =>
                      normalizeDateTimeParts({ ...current, minute: nextMinute }, true),
                    );
                  }}
                  min={0}
                  max={59}
                  onStep={(delta) => {
                    setParts((current) => {
                      const normalized = normalizeDateTimeParts(current, true);
                      return {
                        ...normalized,
                        minute: String(
                          clampNumber(Number(normalized.minute) + delta, 0, 59),
                        ).padStart(2, "0"),
                      };
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = getNowDateTimeParts();
                    setParts(now);
                    setMonth(
                      new Date(
                        Number(now.year),
                        Number(now.month) - 1,
                        Number(now.day),
                        Number(now.hour),
                        Number(now.minute),
                      ),
                    );
                  }}
                  className="ml-1 inline-flex h-7 shrink-0 items-center rounded-full border border-zinc-200/80 px-2.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  现在
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <input type="hidden" name="publishedAt" value={value} />
    </div>
  );
}

type DateSegmentInputProps = {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  inputMode: "numeric";
  className?: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  onTabToNext?: (value: string) => void;
  onArrowDown: () => void;
  onEscape: () => void;
  onFocus?: () => void;
  onBlur?: (value: string) => void;
};

const DateSegmentInput = forwardRef<HTMLInputElement, DateSegmentInputProps>(
  function DateSegmentInputInner(
    {
      label,
      value,
      placeholder,
      maxLength,
      inputMode,
      className,
      onChange,
      onComplete,
      onTabToNext,
      onArrowDown,
      onEscape,
      onFocus,
      onBlur,
    }: DateSegmentInputProps,
    ref,
  ) {
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(event) => {
          const nextValue = sanitizeDigits(event.target.value, maxLength);
          onChange(nextValue);

          if (nextValue.length === maxLength) {
            onComplete?.();
          }
        }}
        onBlur={(event) => {
          onBlur?.(event.target.value);
        }}
        onFocus={(event) => {
          onFocus?.();
          const input = event.currentTarget;
          window.requestAnimationFrame(() => {
            input.select();
          });
        }}
        onClick={(event) => {
          const input = event.currentTarget;
          window.requestAnimationFrame(() => {
            input.select();
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onArrowDown();
          }

          if (event.key === "Escape") {
            onEscape();
          }

          if (event.key === "Tab" && onTabToNext && !event.shiftKey) {
            event.preventDefault();
            onTabToNext(value);
          }
        }}
        aria-label={`发布日期${label}`}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`h-8 bg-transparent px-0 text-center font-mono tabular-nums text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${className ?? ""}`}
      />
    );
  },
);

type TimeStepperProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
};

function TimeStepper({ label, value, min, max, onChange, onStep }: TimeStepperProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-zinc-200/80 bg-white px-1.5 py-0.5 text-zinc-700 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-200">
      <button
        type="button"
        aria-label={`减少${label}`}
        onClick={() => onStep(-1)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
      >
        -
      </button>
      <input
        type="text"
        value={value}
        inputMode="numeric"
        maxLength={2}
        aria-label={`发布日期${label}`}
        onChange={(event) => {
          const nextValue = sanitizeDigits(event.target.value, 2);

          if (!nextValue) {
            onChange("");
            return;
          }

          if (nextValue.length === 2) {
            onChange(String(clampNumber(Number(nextValue), min, max)).padStart(2, "0"));
            return;
          }

          onChange(nextValue);
        }}
        onBlur={(event) => {
          const nextValue = sanitizeDigits(event.target.value, 2);
          if (!nextValue) {
            onChange("");
            return;
          }

          onChange(String(clampNumber(Number(nextValue), min, max)).padStart(2, "0"));
        }}
        onFocus={(event) => {
          const input = event.currentTarget;
          window.requestAnimationFrame(() => {
            input.select();
          });
        }}
        onClick={(event) => {
          const input = event.currentTarget;
          window.requestAnimationFrame(() => {
            input.select();
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onStep(1);
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            onStep(-1);
          }
        }}
        className="w-[2.2ch] bg-transparent text-center font-mono tabular-nums text-xs outline-none"
      />
      <button
        type="button"
        aria-label={`增加${label}`}
        onClick={() => onStep(1)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
      >
        +
      </button>
    </div>
  );
}

type CalendarToolbarProps = {
  month: Date;
  yearOptions: number[];
  monthOptions: Array<{ value: number; label: string }>;
  onMonthChange: (month: Date) => void;
};

function CalendarToolbar({
  month,
  yearOptions,
  monthOptions,
  onMonthChange,
}: CalendarToolbarProps) {
  const currentYear = month.getFullYear();
  const currentMonth = month.getMonth() + 1;

  return (
    <div className="flex w-full items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-1.5">
        <PillSelect
          value={currentYear}
          options={yearOptions.map((value) => ({
            value,
            label: String(value),
          }))}
          onChange={(nextYear) => {
            onMonthChange(new Date(nextYear, currentMonth - 1, 1));
          }}
          minWidth="5rem"
        />
        <PillSelect
          value={currentMonth}
          options={monthOptions}
          onChange={(nextMonth) => {
            onMonthChange(new Date(currentYear, nextMonth - 1, 1));
          }}
          minWidth="4.75rem"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="上一月"
          onClick={() => {
            onMonthChange(new Date(currentYear, currentMonth - 2, 1));
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-90 fill-current" />
        </button>
        <button
          type="button"
          aria-label="下一月"
          onClick={() => {
            onMonthChange(new Date(currentYear, currentMonth, 1));
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <ChevronDown className="h-3.5 w-3.5 -rotate-90 fill-current" />
        </button>
      </div>
    </div>
  );
}

type PillSelectProps = {
  value: number;
  options: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
  minWidth: string;
};

function PillSelect({ value, options, onChange, minWidth }: PillSelectProps) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <span
      className="relative inline-flex items-center rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 text-xs text-zinc-700 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-200"
      style={{ minWidth }}
    >
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={selectedOption.label}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent opacity-0 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="inline-flex items-center whitespace-nowrap pr-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        {selectedOption.label}
      </span>
      <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 fill-current text-sky-500 dark:text-sky-300" />
    </span>
  );
}

function EmptyMonthCaption() {
  return <div className="hidden" />;
}

function EmptyNav() {
  return <div className="hidden" />;
}

function parseDateTimeString(value: string) {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);

  if (match) {
    const [, year, month, day, hour = "0", minute = "0"] = match;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );

    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day) &&
      date.getHours() === Number(hour) &&
      date.getMinutes() === Number(minute)
    ) {
      return date;
    }

    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getInitialDateParts(value: string | null | undefined): DateTimeParts {
  const parsed = value ? parseDateTimeString(value) : null;

  if (parsed) {
    return {
      year: String(parsed.getFullYear()),
      month: String(parsed.getMonth() + 1).padStart(2, "0"),
      day: String(parsed.getDate()).padStart(2, "0"),
      hour: String(parsed.getHours()).padStart(2, "0"),
      minute: String(parsed.getMinutes()).padStart(2, "0"),
    };
  }

  const now = new Date();

  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
    hour: String(now.getHours()).padStart(2, "0"),
    minute: String(now.getMinutes()).padStart(2, "0"),
  };
}

function getNowDateTimeParts(): DateTimeParts {
  const now = new Date();

  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
    hour: String(now.getHours()).padStart(2, "0"),
    minute: String(now.getMinutes()).padStart(2, "0"),
  };
}

function composeDateTimeValue(parts: DateTimeParts) {
  const normalized = normalizeDateTimeParts(parts, true);

  if (
    !normalized.year ||
    !normalized.month ||
    !normalized.day ||
    !normalized.hour ||
    !normalized.minute
  ) {
    return "";
  }

  const value = `${normalized.year.slice(0, 4)}-${normalized.month}-${normalized.day}T${normalized.hour}:${normalized.minute}`;

  return parseDateTimeString(value) ? value : "";
}

function getMonthAnchor(year: string, month: string) {
  if (year.length !== 4 || month.length === 0) {
    return null;
  }

  const normalizedMonth = Number(month);

  if (!Number.isFinite(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
    return null;
  }

  const normalizedYear = Number(year);
  if (!Number.isFinite(normalizedYear)) {
    return null;
  }

  return new Date(normalizedYear, normalizedMonth - 1, 1);
}

function sanitizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function normalizeDateTimeParts(parts: DateTimeParts, complete = false): DateTimeParts {
  const year = sanitizeDigits(parts.year, 4);
  const month = normalizeMonthSegment(parts.month, complete);
  const day = normalizeDaySegment(parts.day, year, month, complete);
  const hour = normalizeTimeSegment(parts.hour, 0, 23, complete);
  const minute = normalizeTimeSegment(parts.minute, 0, 59, complete);

  return { year, month, day, hour, minute };
}

function normalizeMonthSegment(value: string, complete = true) {
  const digits = sanitizeDigits(value, 2);

  if (!digits) {
    return "";
  }

  if (digits.length === 1 && !complete) {
    return digits;
  }

  return String(clampNumber(Number(digits), 1, 12)).padStart(2, "0");
}

function normalizeDaySegment(value: string, year: string, month: string, complete = true) {
  const digits = sanitizeDigits(value, 2);

  if (!digits) {
    return "";
  }

  if (digits.length === 1 && !complete) {
    return digits;
  }

  const dayLimit = getDayLimit(year, month);
  return String(clampNumber(Number(digits), 1, dayLimit)).padStart(2, "0");
}

function normalizeTimeSegment(value: string, min: number, max: number, complete = true) {
  const digits = sanitizeDigits(value, 2);

  if (!digits) {
    return "";
  }

  if (digits.length === 1 && !complete) {
    return digits;
  }

  return String(clampNumber(Number(digits), min, max)).padStart(2, "0");
}

function getDayLimit(year: string, month: string) {
  if (year.length !== 4 || month.length === 0) {
    return 31;
  }

  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (
    !Number.isInteger(normalizedYear) ||
    !Number.isInteger(normalizedMonth) ||
    normalizedMonth < 1 ||
    normalizedMonth > 12
  ) {
    return 31;
  }

  return new Date(normalizedYear, normalizedMonth, 0).getDate();
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
