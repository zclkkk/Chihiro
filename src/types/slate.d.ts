import type { BaseEditor } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
};

type CustomDescendant = CustomElement | CustomText;

type ParagraphElement = {
  type: "paragraph";
  children: CustomDescendant[];
};

type HeadingOneElement = {
  type: "heading-one";
  children: CustomDescendant[];
};

type HeadingTwoElement = {
  type: "heading-two";
  children: CustomDescendant[];
};

type HeadingThreeElement = {
  type: "heading-three";
  children: CustomDescendant[];
};

type BlockQuoteElement = {
  type: "block-quote";
  children: CustomDescendant[];
};

type LinkElement = {
  type: "link";
  url: string;
  children: CustomDescendant[];
};

type ImageElement = {
  type: "image";
  url: string;
  alt?: string | null;
  children: CustomText[];
};

type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | HeadingThreeElement
  | BlockQuoteElement
  | LinkElement
  | ImageElement;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
