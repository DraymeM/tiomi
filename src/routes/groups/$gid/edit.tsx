import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/groups/$gid/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/groups/$gid/edit"!</div>
}
