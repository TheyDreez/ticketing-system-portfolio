import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Ticket } from '../types';
import { useAuthContext } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  createTicket: (ticketData: Partial<Ticket>) => Promise<Ticket | null>;
  updateTicketStatus: (id: string, status: Ticket['status']) => Promise<boolean>;
  addComment: (ticketId: string, content: string) => Promise<boolean>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : data.tickets || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch tickets in TicketContext:', err);
      setError(err.message || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async (ticketData: Partial<Ticket>): Promise<Ticket | null> => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify(ticketData),
      });
      if (res.ok) {
        const newTicket = await res.json();
        setTickets((prev) => [newTicket, ...prev]);
        return newTicket;
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
    }
    return null;
  };

  const updateTicketStatus = async (id: string, status: Ticket['status']): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t))
        );
        return true;
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
    }
    return false;
  };

  const addComment = async (ticketId: string, content: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify({ content }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error adding comment:', err);
      return false;
    }
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        loading,
        error,
        fetchTickets,
        createTicket,
        updateTicketStatus,
        addComment,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTicketContext = () => {
  const context = useContext(TicketContext);
  if (!context) {
    return {
      tickets: [],
      loading: false,
      error: null,
      fetchTickets: async () => {},
      createTicket: async () => null,
      updateTicketStatus: async () => false,
      addComment: async () => false,
    };
  }
  return context;
};
