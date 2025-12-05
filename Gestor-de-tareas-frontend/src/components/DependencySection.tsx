import { useState, useEffect, useCallback } from 'react';
import { http } from '../utils/http';
import type { Task } from '../types/task';
import { DependencyType, type TaskDependency } from '../types/dependency';
// 1. Importamos el contexto de usuario para obtener el ID de quien crea
import { useUser } from '../context/UserContext'; 

interface Props {
  taskId: number;
  teamId: number;
}

export function DependencySection({ taskId, teamId }: Props) {
  const { currentUser } = useUser(); // Hook para sacar el usuario logueado
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [candidateTasks, setCandidateTasks] = useState<Task[]>([]);
  
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<DependencyType>(DependencyType.BLOCKED_BY);
  const [isLoading, setIsLoading] = useState(false);

  // LISTAR: Usamos la ruta /tasks/:taskId/dependencies
  const fetchDependencies = useCallback(async () => {
    try {
      // ⚠️ CORRECCIÓN DE URL: Coincide con tu controlador static listDependencies
      const res = await http.get<{ data: TaskDependency[] }>(`/tasks/${taskId}/dependencies`);
      // Tu controlador devuelve { message, data: [...] }, así que accedemos a .data
      setDependencies(res.data);
    } catch (error) {
      console.error("Error cargando dependencias", error);
    }
  }, [taskId]);

  useEffect(() => {
async function fetchCandidates() {
    if (!teamId) return;
    try {
      // CAMBIO 1: Tipar la respuesta para indicar que viene dentro de un objeto 'data'
      // Asumimos que tu endpoint /tasks devuelve { data: Task[] } o similar
      // Si tu endpoint /tasks devuelve un array directo, avísame. 
      // Pero por el error, seguro devuelve un objeto.
      const res = await http.get<{ data: Task[] }>(`/tasks?teamId=${teamId}`);
      
      // CAMBIO 2: Acceder a res.data antes de filtrar
      if (res.data && Array.isArray(res.data)) {
          setCandidateTasks(res.data.filter(t => t.id !== taskId));
      } else {
          // Fallback por si la estructura es diferente
          console.error("Formato inesperado en /tasks:", res);
          setCandidateTasks([]); 
      }

    } catch (error) {
      console.error("Error cargando candidatos", error);
    }
  }
  fetchCandidates();
  fetchDependencies();
}, [taskId, teamId, fetchDependencies]);

  // AGREGAR
  const handleAddDependency = async () => {
    if (!selectedTargetId || !currentUser) return; // Validamos que haya usuario
    setIsLoading(true);
    try {
      // ⚠️ CORRECCIÓN DE URL Y PAYLOAD
      // Tu controlador createDependency espera el source en la URL y el resto en el body
      await http.post(`/tasks/${taskId}/dependencies`, {
        targetTaskId: Number(selectedTargetId),
        type: selectedType,
        note: "Creada desde el frontend", // Tu controlador acepta nota opcional
        createdById: currentUser.id       // OBLIGATORIO según tu controlador
      });
      
      setSelectedTargetId(""); 
      fetchDependencies(); 
    } catch (error: any) {
      // Mostramos el mensaje exacto que devuelve tu backend (ej: "Ciclo detectado")
      alert("Error: " + (error.message || "No se pudo crear"));
    } finally {
      setIsLoading(false);
    }
  };

  // ELIMINAR
 const handleDelete = async (depId: number) => {
    if (!confirm("¿Borrar esta dependencia?")) return;
    try {
      // ANTES (Estaba mal):
      // await http.delete(`/dependencies/${depId}`);
      
      // AHORA (Correcto, agregando /tasks al principio):
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
            // OJO: Asegúrate que tu servicio (backend) devuelva las relaciones sourceTask y targetTask pobladas
            const otherTask = isSource ? dep.targetTask : dep.sourceTask;
            
            return (
              <li key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <span>
                  {isSource ? (
                    <>Esta tarea <strong>{dep.type}</strong> a: {otherTask?.title || `#${dep.targetTaskId}`}</>
                  ) : (
                    <>Esta tarea es <strong>{dep.type}</strong> por: {otherTask?.title || `#${dep.sourceTaskId}`}</>
                  )}
                </span>
                <button 
                  onClick={() => handleDelete(dep.id)}
                  style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* FORMULARIO */}
      <div style={{ marginTop: '1rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>Agregar relación</h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value as DependencyType)}
            style={{ padding: '0.5rem' }}
          >
            <option value={DependencyType.DEPENDS_ON}>Depende de...</option>
            <option value={DependencyType.BLOCKED_BY}>Es Bloqueada Por...</option>
            <option value={DependencyType.DUPLICATED_WITH}>Es Duplicado de...</option>
          </select>

          <select 
            value={selectedTargetId} 
            onChange={(e) => setSelectedTargetId(e.target.value)}
            style={{ padding: '0.5rem', flex: 1 }}
          >
            <option value="">-- Seleccionar Tarea --</option>
            {candidateTasks.map(t => (
              <option key={t.id} value={t.id}>#{t.id} - {t.title}</option>
            ))}
          </select>

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