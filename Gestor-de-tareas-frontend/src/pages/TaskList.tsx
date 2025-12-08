// src/pages/TaskList.tsx

import { useState, useEffect, useRef } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { http, FriendlyError } from '../utils/http'; 
import { type Task, TaskStatus, TaskPriority } from '../types/task';
// ⭐️ IMPORTANTE: Asegúrate de importar DependencyType
import { DependencyType } from '../types/dependency'; 
import { type Tag } from '../types/tag'; 
import { getFullName } from '../types/user';
import { useDebounce } from '@uidotdev/usehooks';
import { useUser } from '../context/UserContext';

// Supuesto: Tipo de dato de equipo
interface Team {
  id: number;
  name: string;
}

// TIPO DE RESPUESTA PAGINADA
interface PaginatedTasks {
    data: Task[];
    total: number;
    limit: number;
    page: number;
    totalPages: number;
}

// --- COMPONENTES AUXILIARES ---

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: React.CSSProperties = { padding: '2px 8px', borderRadius: '12px', fontSize: '0.875rem', color: 'black' };
  switch (status) {
    case TaskStatus.PENDING:
      return <span style={{ ...styles, backgroundColor: '#FEE2E2' }}>🔴 Pendiente</span>;
    case TaskStatus.IN_PROGRESS:
      return <span style={{ ...styles, backgroundColor: '#FEF3C7' }}>🟡 En curso</span>;
    case TaskStatus.COMPLETED:
      return <span style={{ ...styles, backgroundColor: '#D1FAE5' }}>✅ Finalizada</span>;
    case TaskStatus.CANCELLED:
      return <span style={{ ...styles, backgroundColor: '#E5E7EB' }}>⚫ Cancelada</span>;
    default:
      return <span style={{ ...styles, backgroundColor: '#E5E7EB' }}>{status}</span>;
  }
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
   switch (priority) {
    case TaskPriority.HIGH: return <span>🔴 Alta</span>;
    case TaskPriority.MEDIUM: return <span>🟡 Media</span>;
    case TaskPriority.LOW: return <span>🟢 Baja</span>;
    default: return <span>{priority}</span>;
  }
}

// ⭐️ COMPONENTE DE ICONOS DE DEPENDENCIA (NUEVO) ⭐️
const TaskDependencyIcons = ({ task }: { task: Task }) => {
  // Protección contra undefined (por si el backend no manda el array vacío)
  const outgoing = task.outgoingDependencies || [];
  const incoming = task.incomingDependencies || [];

  const isBlocked = outgoing.some(d => d.type === DependencyType.BLOCKED_BY);
  const hasDependency = outgoing.some(d => d.type === DependencyType.DEPENDS_ON);
  
  // Duplicado puede ser entrante o saliente
  const isDuplicated = 
    outgoing.some(d => d.type === DependencyType.DUPLICATED_WITH) ||
    incoming.some(d => d.type === DependencyType.DUPLICATED_WITH);

  if (!isBlocked && !hasDependency && !isDuplicated) return null;

  return (
    <span style={{ marginLeft: '8px', display: 'inline-flex', gap: '4px', verticalAlign: 'middle' }}>
      {isBlocked && <span title="Bloqueada por otra tarea" style={{ cursor: 'help' }}>⛔</span>}
      {hasDependency && <span title="Depende de otra tarea" style={{ cursor: 'help' }}>⏳</span>}
      {isDuplicated && <span title="Tarea duplicada" style={{ cursor: 'help' }}>👯</span>}
    </span>
  );
};

// --- COMPONENTE DE ERROR ---
interface ErrorProps {
    error: Error | string | null;
    onRetry?: () => void;
}
const errorContainerStyle: React.CSSProperties = {
    padding: '1.5rem',
    textAlign: 'center',
    backgroundColor: '#FFF0F0',
    border: '1px solid #FFC0C0',
    borderRadius: '6px',
    margin: '1rem 0',
};

const ErrorMessage: React.FC<ErrorProps> = ({ error, onRetry }) => {
    if (!error) return null;

    const message = error instanceof Error ? error.message : String(error);
    let icon = '❌'; 
    let title = 'Error al cargar tareas';

    if (error instanceof FriendlyError && message.includes("Error de Conexión")) {
        icon = '⚠️'; 
        title = '¡Sin Conexión!';
    } else if (message.includes('HTTP Error') || message.includes('no encontrado')) {
        title = 'Error de la API';
    }

    return (
        <div style={errorContainerStyle}>
            <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>{icon}</p>
            <h3 style={{ margin: '0 0 0.5rem', color: '#CC0000' }}>{title}</h3>
            <p style={{ margin: '0 0 1rem', color: '#333' }}>{message}</p>
            
            {onRetry && (
                <button 
                    onClick={onRetry}
                    style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: '#4285F4', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Reintentar
                </button>
            )}
        </div>
    );
};

// =========================================================
// COMPONENTE PRINCIPAL: TaskList
// =========================================================
export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null); 
  const navigate = useNavigate(); 
  const { memberships } = useUser(); 

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0); 
  const ITEMS_PER_PAGE = 10; 

  // --- FILTROS ---
  const [statusFilter, setStatusFilter] = useState<string>(""); 
  const [priorityFilter, setPriorityFilter] = useState<string>(""); 
  const [teamFilter, setTeamFilter] = useState<string>(""); 
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>(""); 
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagFilter, setTagFilter] = useState<string>(""); 
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const lastFiltersRef = useRef('');

  // --- FETCH DE TAREAS ---
  const fetchTasks = async (pageToFetch: number) => { 
    setIsLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (teamFilter) params.append('teamId', teamFilter);
    if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
    if (dueDateFrom) params.append('dueDateFrom', dueDateFrom);
    if (dueDateTo) params.append('dueDateTo', dueDateTo);
    if (tagFilter) params.append('tags', tagFilter);
    
    params.append('page', String(pageToFetch)); 
    params.append('limit', String(ITEMS_PER_PAGE));
    
    const queryString = params.toString();

    try {
      const response = await http.get<PaginatedTasks>(`/tasks?${queryString}`);
      setTasks(response.data); 
      setTotalPages(response.totalPages);
      setTotalTasks(response.total);
      setCurrentPage(response.page); 
    } catch (err: any) {
      setError(err); 
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRetry = () => {
    fetchTasks(currentPage);
  };

  // Cargar etiquetas iniciales
  useEffect(() => {
    http.get<{ data: Tag[] }>('/tags')
      .then(response => setAllTags(response.data))
      .catch(err => console.error("Error al cargar etiquetas:", err)); 
  }, []); 

  // Effect principal de búsqueda
  useEffect(() => {
    const currentFilters = [statusFilter, priorityFilter, teamFilter, debouncedSearchTerm, dueDateFrom, dueDateTo, tagFilter].join();
    
    if (currentPage !== 1 && currentFilters !== lastFiltersRef.current) {
         lastFiltersRef.current = currentFilters;
         setCurrentPage(1); 
         return; 
    }
    
    fetchTasks(currentPage); 
    lastFiltersRef.current = currentFilters;
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, teamFilter, debouncedSearchTerm, dueDateFrom, dueDateTo, tagFilter, currentPage]); 
  

  // --- HANDLERS PAGINACIÓN ---
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };
  
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const clearFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setTeamFilter("");
    setSearchTerm("");
    setDueDateFrom("");
    setDueDateTo("");
    setTagFilter(""); 
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Tareas</h2>
        <ErrorMessage error={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Tareas (Página {currentPage} de {totalPages})</h2>
        <button 
          onClick={() => navigate('/tasks/new')} 
          style={buttonStyle}
        >
          + Nueva Tarea
        </button>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '1rem' }}>
        
        {/* Fila 1 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <select style={filterSelectStyle} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">Equipo (Todos)</option>
            {memberships.filter(m => m.team).map(m => (
              <option key={m.team!.id} value={m.team!.id}>{m.team!.name}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="🔍 Buscar por título o descripción..." 
            style={{ ...filterSelectStyle, flex: 1 }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Fila 2 */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <select style={filterSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Estado (Todos)</option>
            {Object.values(TaskStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select style={filterSelectStyle} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">Prioridad (Todas)</option>
            {Object.values(TaskPriority).map(prio => (
              <option key={prio} value={prio}>{prio}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={dateLabelStyle}>Vence (Desde):</label>
            <input type="date" style={filterSelectStyle} value={dueDateFrom} onChange={(e) => setDueDateFrom(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={dateLabelStyle}>Vence (Hasta):</label>
            <input type="date" style={filterSelectStyle} value={dueDateTo} onChange={(e) => setDueDateTo(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={dateLabelStyle}>Etiqueta:</label>
            <select style={filterSelectStyle} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">Etiqueta (Todas)</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id.toString()}>{tag.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={clearFilters}
            style={{ ...filterSelectStyle, backgroundColor: '#F3F4F6', cursor: 'pointer', marginLeft: 'auto' }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {isLoading && <p>⏳ Cargando tareas...</p>}

      {!isLoading && !error && tasks.length === 0 && (
         <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
          <span style={{ fontSize: '2rem' }}>📋</span>
          <h3>No se encontraron tareas.</h3>
        </div>
      )}

      {/* --- TABLA DE TAREAS --- */}
      {!isLoading && tasks.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#F3F4F6' }}>
            <tr>
              <th style={tableHeaderStyle}>#</th>
              <th style={tableHeaderStyle}>Título</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Estado</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Prioridad</th>
              <th style={tableHeaderStyle}>Vence</th>
              <th style={tableHeaderStyle}>Asignado</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr 
                key={task.id} 
                style={{ borderBottom: '1px solid #E5E7EB', cursor: 'pointer' }}
                onClick={() => navigate(`/tasks/${task.id}`)} 
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'} 
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <td style={tableCellStyle}>{task.id}</td>
                
                {/* ⭐️ AQUÍ ESTÁ EL CAMBIO PRINCIPAL: INCLUIMOS LOS ICONOS ⭐️ */}
                <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>
                    {task.title}
                    <TaskDependencyIcons task={task} />
                </td>
                
                <td style={{ ...tableCellStyle, textAlign: 'center' }}> <StatusBadge status={task.status} /> </td>
                <td style={{ ...tableCellStyle, textAlign: 'center' }}> <PriorityBadge priority={task.priority} /> </td>
                <td style={tableCellStyle}>{formatDate(task.dueDate)}</td>
                <td style={{ ...tableCellStyle }}>
                  {task.assignedTo ? getFullName(task.assignedTo) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          
          {/* CONTROLES DE PAGINACIÓN */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                  Mostrando {tasks.length} de {totalTasks} tareas.
              </p>
              <div>
                  <button 
                      onClick={handlePrev} 
                      disabled={isFirstPage || isLoading}
                      style={{ ...paginationButtonStyle, opacity: isFirstPage || isLoading ? 0.5 : 1 }}
                  >
                      &larr; Anterior
                  </button>
                  <span style={{ margin: '0 1rem' }}>
                      Página {currentPage} de {totalPages}
                  </span>
                  <button 
                      onClick={handleNext} 
                      disabled={isLastPage || isLoading}
                      style={{ ...paginationButtonStyle, opacity: isLastPage || isLoading ? 0.5 : 1 }}
                  >
                      Siguiente &rarr;
                  </button>
              </div>
          </div>
        </>
      )}
    </div>
  );
}

// ESTILOS
const paginationButtonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: '1px solid #D1D5DB',
    backgroundColor: 'white',
    cursor: 'pointer',
};
const tableHeaderStyle: React.CSSProperties = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' };
const tableCellStyle: React.CSSProperties = { padding: '0.75rem 1rem', verticalAlign: 'middle' };
const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontSize: '1rem',
  color: 'white',
  backgroundColor: '#3B82F6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};
const filterSelectStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid #D1D5DB',
  backgroundColor: 'white',
  fontSize: '0.875rem' 
};
const dateLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#6B7280',
  marginBottom: '2px',
  paddingLeft: '4px'
};