'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlatformItem } from '@/types/profile';
import type { SavedFilterItem } from '@/lib/profileFilters';
import { ConfirmModal } from './ConfirmModal';
import { CustomPlatformModal } from './CustomPlatformModal';
import { TagEditModal } from './TagEditModal';
import { CollectionEditModal } from './CollectionEditModal';
import type { CollectionInfo, TagInfo } from '@/hooks/useCatalog';

/** Which platform/tag/collection/saved-filter dialog is open. */
export function useCatalogDialogs() {
  const [isPlatformModalOpen, setPlatformModalOpen] = useState(false);
  const [editPlatform, setEditPlatform] = useState<PlatformItem | null>(null);
  const [deletePlatform, setDeletePlatform] = useState<PlatformItem | null>(null);
  const [editTag, setEditTag] = useState<TagInfo | null>(null);
  const [deleteTag, setDeleteTag] = useState<TagInfo | null>(null);
  const [editCollection, setEditCollection] = useState<CollectionInfo | null>(null);
  const [deleteCollection, setDeleteCollection] = useState<CollectionInfo | null>(null);
  const [deleteSavedFilter, setDeleteSavedFilter] = useState<SavedFilterItem | null>(null);

  return {
    isPlatformModalOpen, editPlatform, deletePlatform, editTag, deleteTag, editCollection, deleteCollection, deleteSavedFilter,
    openNewPlatform: () => { setEditPlatform(null); setPlatformModalOpen(true); },
    openEditPlatform: (platform: PlatformItem) => { setEditPlatform(platform); setPlatformModalOpen(true); },
    closePlatformModal: () => { setPlatformModalOpen(false); setEditPlatform(null); },
    setDeletePlatform, setEditTag, setDeleteTag, setEditCollection, setDeleteCollection, setDeleteSavedFilter,
  };
}

interface CatalogDialogsProps {
  dialogs: ReturnType<typeof useCatalogDialogs>;
  /** Called after any change so the lists and counters reload. */
  onChanged: () => Promise<void>;
  onPlatformCreated: (platform: PlatformItem) => Promise<void>;
  onPlatformUpdated: (platform: PlatformItem) => Promise<void>;
  /** Called with the removed item so the page can drop a filter that pointed at it. */
  onPlatformDeleted: (platform: PlatformItem) => void;
  onTagDeleted: (tagName: string) => void;
  onCollectionDeleted: (collectionName: string) => void;
  onSavedFilterDeleted: (filter: SavedFilterItem) => Promise<void>;
}

const quoted = (name?: string) => `“${name || ''}”`;

export function CatalogDialogs({ dialogs, onChanged, onPlatformCreated, onPlatformUpdated, onPlatformDeleted, onTagDeleted, onCollectionDeleted, onSavedFilterDeleted }: CatalogDialogsProps) {
  const { t } = useTranslation();

  const confirmDelete = async (url: string, close: () => void, then: () => void) => {
    close();
    const response = await fetch(url, { method: 'DELETE' });
    if (response.ok) { await onChanged(); then(); }
  };

  return (
    <>
      <CustomPlatformModal
        isOpen={dialogs.isPlatformModalOpen}
        onClose={dialogs.closePlatformModal}
        editData={dialogs.editPlatform}
        onCreated={onPlatformCreated}
        onUpdated={onPlatformUpdated}
      />

      {dialogs.editTag && (
        <TagEditModal
          isOpen
          tagId={dialogs.editTag.id}
          tagName={dialogs.editTag.name}
          tagColor={dialogs.editTag.color}
          onClose={() => dialogs.setEditTag(null)}
          onUpdated={async () => { dialogs.setEditTag(null); await onChanged(); }}
        />
      )}

      {dialogs.editCollection && (
        <CollectionEditModal
          isOpen
          collectionId={dialogs.editCollection.id}
          collectionName={dialogs.editCollection.name}
          onClose={() => dialogs.setEditCollection(null)}
          onRenamed={async () => { dialogs.setEditCollection(null); await onChanged(); }}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(dialogs.deletePlatform)}
        title={t('sidebar.deletePlatform')}
        message={t('home.deletePlatformMessage', { name: quoted(dialogs.deletePlatform?.name), count: dialogs.deletePlatform?.count || 0 })}
        confirmLabel={t('sidebar.deletePlatform')}
        isDangerous
        onConfirm={() => {
          const target = dialogs.deletePlatform;
          if (target) void confirmDelete(`/api/platforms/${target.id}`, () => dialogs.setDeletePlatform(null), () => onPlatformDeleted(target));
        }}
        onCancel={() => dialogs.setDeletePlatform(null)}
      />

      <ConfirmModal
        isOpen={Boolean(dialogs.deleteTag)}
        title={t('sidebar.deleteTag')}
        message={t('home.deleteTagMessage', { name: quoted(dialogs.deleteTag?.name), count: dialogs.deleteTag?.count || 0 })}
        confirmLabel={t('sidebar.deleteTag')}
        isDangerous
        onConfirm={() => {
          const target = dialogs.deleteTag;
          if (target) void confirmDelete(`/api/tags/${target.id}`, () => dialogs.setDeleteTag(null), () => onTagDeleted(target.name));
        }}
        onCancel={() => dialogs.setDeleteTag(null)}
      />

      <ConfirmModal
        isOpen={Boolean(dialogs.deleteCollection)}
        title={t('sidebar.deleteCollection')}
        message={t('home.deleteCollectionMessage', { name: quoted(dialogs.deleteCollection?.name), count: dialogs.deleteCollection?.count || 0 })}
        confirmLabel={t('sidebar.deleteCollection')}
        isDangerous
        onConfirm={() => {
          const target = dialogs.deleteCollection;
          if (target) void confirmDelete(`/api/collections/${target.id}`, () => dialogs.setDeleteCollection(null), () => onCollectionDeleted(target.name));
        }}
        onCancel={() => dialogs.setDeleteCollection(null)}
      />

      <ConfirmModal
        isOpen={Boolean(dialogs.deleteSavedFilter)}
        title={t('savedFilters.deleteTitle')}
        message={t('savedFilters.deleteMessage', { name: quoted(dialogs.deleteSavedFilter?.name) })}
        confirmLabel={t('savedFilters.delete')}
        isDangerous
        onConfirm={() => {
          const target = dialogs.deleteSavedFilter;
          dialogs.setDeleteSavedFilter(null);
          if (target) void onSavedFilterDeleted(target);
        }}
        onCancel={() => dialogs.setDeleteSavedFilter(null)}
      />
    </>
  );
}
