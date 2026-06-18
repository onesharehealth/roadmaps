type RoadmapZonesDescriptorProps = {
  isConnected: boolean
  canReorder: boolean
}

export function RoadmapZonesDescriptor({
  isConnected,
  canReorder,
}: RoadmapZonesDescriptorProps) {
  return {
    title: 'Long-term Roadmap',
    description: (
      <>
        <p>
          Items are automatically assigned to zones based on their position.
          Each item represents 1–6 weeks of work.
          {canReorder && ' Drag to reorder.'}
        </p>
        {!isConnected && (
          <p className="mt-2 text-orange-600 dark:text-orange-400">
            Not connected — changes will not be saved.
          </p>
        )}
      </>
    ),
  }
}
