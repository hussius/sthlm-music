/**
 * Loading skeleton placeholder for event cards.
 *
 * Displays animated gray boxes matching event card dimensions
 * to provide visual feedback during data loading.
 */

export function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white h-[200px]">
      <div className="w-[70%] h-6 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="w-[50%] h-4 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="w-[40%] h-4 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="w-[60%] h-4 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}
