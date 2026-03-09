import { ArchitectureDiagram } from './ArchitectureDiagram'

export function DiagramBlock() {
  return (
    <div className="mk-diagram-block" style={{ margin: '0 auto', maxWidth: 720 }}>
      <ArchitectureDiagram />
    </div>
  )
}
