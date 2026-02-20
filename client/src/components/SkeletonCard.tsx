/**
 * Loading skeleton placeholder for event cards.
 *
 * Displays animated gray boxes matching event card dimensions
 * to provide visual feedback during data loading.
 */

export function SkeletonCard() {
  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#fff',
        height: '200px',
      }}
    >
      <div
        style={{
          width: '70%',
          height: '24px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '12px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '50%',
          height: '18px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '12px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '40%',
          height: '18px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '12px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '60%',
          height: '18px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
}
