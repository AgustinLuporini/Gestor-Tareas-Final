import { useState, useEffect, useCallback } from 'react';
import { http } from '../utils/http';
import type { Task } from '../types/task';
import { DependencyType, type TaskDependency } from '../types/dependency';
import { useUser } from '../context/UserContext';

// Diccionario de etiquetas
const TYPE_LABELS: Record<string, string> = {
  DEPENDS_ON: "Depende de",
  BLOCKED_BY: "Bloqueada por",
  DUPLICATED_WITH: "Es duplicado de"
};

interface Props {
  taskId: number;
  teamId: number;
}

export function DependencySection({ taskId, teamId }: Props) {
  const { currentUser } = useUser();
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [candidateTasks, setCandidateTasks] = useState<Task[]>([]);
  
  // Estado del formulario
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<DependencyType>(DependencyType.BLOCKED_BY);
  // ⭐️ 1. NUEVO ESTADO PARA LA NOTA
  const [note, setNote] = useState(""); 
  
  const [isLoading, setIsLoading] = useState(false);

  // Cargar dependencias
  const fetchDependencies = useCallback(async () => {
    try {
      const res = await http.get<{ data: TaskDependency[] }>(`/tasks/${taskId}/dependencies`);
      setDependencies(res.data);
    } catch (error) {
      console.error("Error cargando dependencias", error);
    }
  }, [taskId]);

  // Cargar candidatos
  useEffect(() => {
    async function fetchCandidates() {
      if (!teamId) return;
      try {
        const res = await http.get<{ data: Task[] }>(`/tasks?teamId=${teamId}`);
        if (res.data && Array.isArray(res.data)) {
          setCandidateTasks(res.data.filter(t => t.id !== taskId));
        } else {
           setCandidateTasks([]);
        }
      } catch (error) {
        console.error("Error cargando candidatos", error);
      }
    }
    fetchCandidates();
    fetchDependencies();
  }, [taskId, teamId, fetchDependencies]);

  // Agregar dependencia
  const handleAddDependency = async () => {
    if (!selectedTargetId || !currentUser) return;
    setIsLoading(true);
    try {
      await http.post(`/tasks/${taskId}/dependencies`, {
        targetTaskId: Number(selectedTargetId),
        type: selectedType,
        note: note.trim(), // ⭐️ 2. ENVIAMOS LA NOTA (si está vacía no pasa nada)
        createdById: currentUser.id
      });
      
      // Limpiamos el form
      setSelectedTargetId("");
      setNote(""); // ⭐️ Limpiamos la nota también
      fetchDependencies();
    } catch (error: any) {
      alert("Error: " + (error.message || "No se pudo crear"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (depId: number) => {
    if (!confirm("¿Borrar esta dependencia?")) return;
    try {
      await http.delete(`/tasks/dependencies/${depId}`);
      fetchDependencies();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🔗 Dependencias y Bloqueos</h3>

      {/* LISTA */}
      {dependencies.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No hay dependencias registradas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {dependencies.map(dep => {
            const isSource = dep.sourceTaskId === taskId;
            const otherTask = isSource ? dep.targetTask : dep.sourceTask;
            const otherTaskName = otherTask?.title || `Tarea #${isSource ? dep.targetTaskId : dep.sourceTaskId}`;

            return (
              <li key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: '0.95rem' }}>
                  {isSource ? (
                    <><strong>{TYPE_LABELS[dep.type] || dep.type}:</strong> {otherTaskName}</>
                  ) : (
                    <>
                      {dep.type === 'BLOCKED_BY' ? (
                        <><strong>Me bloquea:</strong> {otherTaskName}</>
                      ) : dep.type === 'DEPENDS_ON' ? (
                        <><strong>Es requisito para:</strong> {otherTaskName}</>
                      ) : (
                        <><strong>{dep.type} con:</strong> {otherTaskName}</>
                      )}
                    </>
                  )}
                  
                  {/* ⭐️ 3. MOSTRAMOS LA NOTA SI EXISTE */}
                  {dep.note && (
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginTop: '0.25rem', fontStyle: 'italic', backgroundColor: '#fdfdfd', padding: '2px 6px', borderRadius: '4px', borderLeft: '3px solid #ddd' }}>
                      📝 {dep.note}
                    </span>
                  )}
                </span>

                <button 
                  onClick={() => handleDelete(dep.id)}
                  title="Eliminar relación"
                  style={{ color: '#EF4444', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', marginLeft: '1rem' }}
                >
                  🗑️
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* FORMULARIO DE AGREGAR */}
      <div style={{ marginTop: '1rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>Agregar relación</h4>
        
        {/* Contenedor Flex para que se vea ordenado */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value as DependencyType)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value={DependencyType.DEPENDS_ON}>Depende de...</option>
            <option value={DependencyType.BLOCKED_BY}>Es Bloqueada Por...</option>
            <option value={DependencyType.DUPLICATED_WITH}>Es Duplicado de...</option>
          </select>

          <select 
            value={selectedTargetId} 
            onChange={(e) => setSelectedTargetId(e.target.value)}
            style={{ padding: '0.5rem', flex: 1, borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
          >
            <option value="">-- Seleccionar Tarea --</option>
            {candidateTasks.map(t => (
              <option key={t.id} value={t.id}>#{t.id} - {t.title}</option>
            ))}
          </select>

          {/* ⭐️ 4. CAMPO DE ENTRADA PARA LA NOTA */}
          <input 
            type="text" 
            placeholder="Nota opcional (ej: Esperar a que aprueben presupuesto)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ padding: '0.5rem', flex: 2, borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
          />

          <button 
            onClick={handleAddDependency}
            disabled={isLoading || !selectedTargetId}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isLoading ? '...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}