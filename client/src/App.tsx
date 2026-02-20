import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { EventList } from './components/EventList'

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
        <div>
          <header
            style={{
              backgroundColor: '#fff',
              borderBottom: '1px solid #e0e0e0',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <h1 style={{ margin: 0, fontSize: '32px', color: '#1a1a1a' }}>
              Stockholm Events Calendar
            </h1>
          </header>
          <EventList />
        </div>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
