"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Image,
  ExternalLink,
  ChevronLeft,
  Tag,
  User,
  Eye,
} from "lucide-react";
import {
  EducationMaterial,
  ContentType,
  CATEGORY_COLORS,
  parseTags,
  categoryLabel,
} from "./types";

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  article: <BookOpen className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  pdf: <FileText className="w-5 h-5" />,
  link: <LinkIcon className="w-5 h-5" />,
  handout: <Image className="w-5 h-5" />,
  infographic: <Image className="w-5 h-5" />,
};

interface Props {
  material: EducationMaterial;
  onBack: () => void;
}

export default function MaterialDetail({ material, onBack }: Props) {
  const tags = parseTags(material.tags);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
          Material Detail
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Title + Icon */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {CONTENT_TYPE_ICONS[material.contentType] || <BookOpen className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {material.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[material.category] || CATEGORY_COLORS.other}`}>
                {categoryLabel(material.category)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium capitalize">
                {material.contentType}
              </span>
              {!material.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {material.author && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>{material.author}</span>
            </div>
          )}
          {material.source && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span>{material.source}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Eye className="w-4 h-4" />
            <span>{material.viewCount || 0} views</span>
          </div>
          {material.language && (
            <div className="text-gray-600 dark:text-gray-400">
              Language: <span className="font-medium uppercase">{material.language}</span>
            </div>
          )}
          {material.audience && (
            <div className="text-gray-600 dark:text-gray-400">
              Audience: <span className="font-medium capitalize">{material.audience}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* External URL */}
        {material.externalUrl && (
          <a
            href={material.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Open External Resource
          </a>
        )}

        {/* Content body */}
        {material.content && (
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {material.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
