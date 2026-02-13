# Frontend Development Guidelines

Modern frontend application built with flexibility in mind.

## Framework Choice

**You choose!** Common options:

- **React + Vite** (Recommended for speed)
  ```bash
  npm create vite@latest . -- --template react-ts
  ```

- **Next.js** (For SSR/routing)
  ```bash
  npx create-next-app@latest .
  ```

- **SvelteKit** (For simplicity)
  ```bash
  npm create svelte@latest .
  ```

## Code Style (React/TypeScript Example)

### Component Structure

```typescript
// Good: Functional component with TypeScript
interface UserCardProps {
  user: User;
  onEdit: (id: number) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
}
```

### Naming Conventions

- **Components:** `PascalCase` - `UserCard.tsx`
- **Hooks:** `camelCase` with `use` prefix - `useUser.ts`
- **Utils:** `camelCase` - `formatDate.ts`
- **Constants:** `UPPER_SNAKE_CASE` - `API_BASE_URL`

### File Organization

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── ui/          # Basic UI components
│   │   └── features/    # Feature-specific components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom hooks
│   ├── services/        # API calls
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── App.tsx          # Root component
├── public/              # Static assets
└── package.json
```

## API Integration

### Environment Variables

Create `.env.local`:

```bash
VITE_API_URL=http://localhost:8098
```

Access in code:

```typescript
const API_URL = import.meta.env.VITE_API_URL;
```

### API Service Pattern

```typescript
// services/api.ts
const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(userData: UserCreate) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },
};
```

### React Query (Optional but Recommended)

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from './services/api';

function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## State Management

### Local State (React)

```typescript
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Global State Options

**For hackathon simplicity:**
- **Context API** - Built-in React solution
- **Zustand** - Minimal boilerplate
- **Redux Toolkit** - If you need Redux

**Pick based on complexity:**
- Simple app: Context API
- Medium complexity: Zustand
- Complex state logic: Redux Toolkit

## TypeScript

### Define Types

```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface UserCreate {
  name: string;
  email: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
}
```

### Use Types Consistently

```typescript
// Good: Typed props and state
interface UserFormProps {
  onSubmit: (user: UserCreate) => void;
}

function UserForm({ onSubmit }: UserFormProps) {
  const [formData, setFormData] = useState<UserCreate>({
    name: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Styling

### Options

**CSS Modules (Simple):**
```typescript
import styles from './UserCard.module.css';

export function UserCard() {
  return <div className={styles.card}>...</div>;
}
```

**Tailwind (Popular):**
```typescript
export function UserCard() {
  return <div className="bg-white rounded-lg shadow p-4">...</div>;
}
```

**Styled Components (CSS-in-JS):**
```typescript
import styled from 'styled-components';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1rem;
`;

export function UserCard() {
  return <Card>...</Card>;
}
```

Pick what your team knows or wants to learn.

## Testing

### Component Tests (Vitest + Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('renders user name', () => {
    const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage  # With coverage
```

## Common Commands

```bash
# Development
npm run dev           # Start dev server with HMR

# Build
npm run build         # Production build
npm run preview       # Preview production build

# Code Quality
npm run format        # Format with Prettier
npm run lint          # Lint with ESLint
npm test              # Run tests

# Dependencies
npm install package   # Add dependency
npm install -D package  # Add dev dependency
```

## Performance

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

function ExpensiveList({ items }: { items: Item[] }) {
  // Memoize expensive computation
  const processedItems = useMemo(
    () => items.map(item => expensiveTransform(item)),
    [items]
  );

  // Memoize callback to prevent re-renders
  const handleClick = useCallback(
    (id: number) => {
      console.log('Clicked:', id);
    },
    []
  );

  return <div>...</div>;
}
```

## Backend Communication

### CORS

Backend must allow your origin:

```
CORS_ORIGINS=http://localhost:3000
```

### Error Handling

```typescript
async function fetchUsers() {
  try {
    const response = await fetch(`${API_URL}/users`);

    if (!response.ok) {
      // Handle HTTP errors
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    console.error('Failed to fetch users:', error);
    throw error;
  }
}
```

### Loading States

```typescript
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <ul>{/* render users */}</ul>;
}
```

## Accessibility

### Semantic HTML

```typescript
// Good: Semantic elements
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Bad: Generic divs
<div className="nav">
  <div className="list">...</div>
</div>
```

### ARIA Labels

```typescript
<button
  aria-label="Delete user"
  onClick={() => deleteUser(user.id)}
>
  <TrashIcon />
</button>
```

### Keyboard Navigation

```typescript
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

## Debugging

### React DevTools

Install browser extension for component inspection and profiling.

### Console Debugging

```typescript
function UserCard({ user }: UserCardProps) {
  console.log('Rendering UserCard:', user);

  useEffect(() => {
    console.log('UserCard mounted');
    return () => console.log('UserCard unmounted');
  }, []);

  return <div>...</div>;
}
```

## Hackathon Tips

- **Start with routing:** Set up pages/routes first
- **Mock API early:** Use placeholder data before backend ready
- **Reuse components:** Build UI library as you go
- **Test in browser:** Use React DevTools to inspect
- **Check ADRs:** Reference architectural decisions
- **Commit frequently:** Use `/checkpoint` after each feature

## Common Pitfalls

### ❌ Not handling loading states
```typescript
// Bad
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.getUsers().then(setUsers); }, []);
  return <ul>{users.map(...)}</ul>; // Flashes empty before loading
}

// Good
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);
  if (loading) return <div>Loading...</div>;
  return <ul>{users.map(...)}</ul>;
}
```

### ❌ Prop drilling

Use Context or state management for deeply nested data.

### ❌ Missing key props

```typescript
// Bad
{users.map(user => <UserCard user={user} />)}

// Good
{users.map(user => <UserCard key={user.id} user={user} />)}
```

---

*For general guidelines, see root `CLAUDE.md`. For backend integration, see `backend/CLAUDE.md`.*
