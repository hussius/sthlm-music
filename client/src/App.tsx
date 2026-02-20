import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { EventList } from './components/EventList'
import { FilterBar } from './components/FilterBar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 60 seconds
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 p-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Stockholm Music Events
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              All times in Stockholm time (CET/CEST)
            </p>
          </header>

          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="lg:w-64 flex-shrink-0">
                <FilterBar />
              </aside>

              <main className="flex-1 min-w-0">
                <EventList />
              </main>
            </div>
          </div>
        </div>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
