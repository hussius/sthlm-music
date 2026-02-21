/**
 * Loading skeleton placeholder for compact event cards.
 *
 * Displays animated gray boxes matching compact card dimensions
 * to provide visual feedback during data loading.
 */

export function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white h-[120px]">
      {/* Date badge and title row */}
      <div className="flex justify-between items-start mb-2">
        <div className="w-[70%] h-4 bg-gray-200 rounded animate-pulse" />
        <div className="w-14 h-6 bg-gray-200 rounded animate-pulse ml-2" />
      </div>
      {/* Venue and time */}
      <div className="space-y-2 mt-3">
        <div className="w-[50%] h-3 bg-gray-200 rounded animate-pulse" />
        <div className="w-[40%] h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
