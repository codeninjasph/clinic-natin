'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Sparkles,
  Phone,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PatientSearchResult {
  id: string | null;
  fullName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  allergies: string[];
  appointmentId: string | null;
  tokenCode: string | null;
  queueStatus: string | null;
  queueNumber: number | null;
  isQueued: boolean;
}

interface PatientSearchAutocompleteProps {
  selectedPatientId: string | null;
  patientName: string;
  patientAge: string;
  tokenCode?: string;
  allergies?: string[];
  onSelect: (patient: PatientSearchResult) => void;
  onSelectWalkIn: (name: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function PatientSearchAutocomplete({
  selectedPatientId,
  patientName,
  patientAge,
  tokenCode,
  allergies = [],
  onSelect,
  onSelectWalkIn,
  onClear,
  disabled = false,
}: PatientSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch search results (debounced)
  const fetchPatients = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/doctor/search-patients?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data?.patients) {
        setResults(data.patients);
      }
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchPatients(query);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen, fetchPatients]);

  const handleInputFocus = () => {
    setIsOpen(true);
    if (results.length === 0) {
      fetchPatients(query);
    }
  };

  const handleSelectPatient = (patient: PatientSearchResult) => {
    onSelect(patient);
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const handleChooseWalkIn = (nameToUse: string) => {
    const trimmed = nameToUse.trim();
    if (!trimmed) return;
    onSelectWalkIn(trimmed);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelectPatient(results[activeIndex]);
      } else if (query.trim().length > 0) {
        handleChooseWalkIn(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isSelected = !!patientName;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── 1. SELECTED PATIENT DISPLAY CARD ──────────────────────────────────── */}
      {isSelected ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-brand-50/80 border-2 border-brand-200 rounded-2xl transition-all">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-700 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  {patientName}
                </span>
                {selectedPatientId ? (
                  <Badge variant="brand" className="text-[10px] gap-1 py-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Passport Linked
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] text-slate-600">
                    Unlinked Walk-in
                  </Badge>
                )}
                {tokenCode && (
                  <Badge variant="outline" className="font-mono text-[10px] bg-white text-brand-800 border-brand-300">
                    Token: {tokenCode}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 flex-wrap">
                {patientAge && <span>{patientAge}</span>}
                {allergies && allergies.length > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md text-[10px]">
                    <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                    Allergies: {allergies.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClear();
                setTimeout(() => {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }, 50);
              }}
              className="h-8 text-xs font-semibold gap-1 text-slate-700 hover:text-brand-900 bg-white"
            >
              <Search className="h-3 w-3" />
              Change Patient
            </Button>
          </div>
        </div>
      ) : (
        /* ── 2. AUTOCOMPLETE SEARCH INPUT ────────────────────────────────────── */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder="Search patient by name, mobile number, or queue token (e.g. Dianne, CN-ON001)..."
              disabled={disabled}
              className="pl-10 pr-9 py-2.5 text-xs font-semibold bg-white border-2 border-brand-100 focus:border-brand-500 rounded-xl shadow-xs"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-brand-600" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* ── 3. SEARCH RESULTS DROPDOWN ────────────────────────────────────── */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-84 overflow-y-auto">
              {/* Category Header */}
              <div className="px-3 py-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{query ? `Search results for "${query}"` : "Today's Clinic Queue & Registered Patients"}</span>
                <span className="text-[10px] text-slate-400">Click or use ↑↓ Enter</span>
              </div>

              {results.length === 0 && !isLoading ? (
                <div className="p-4 text-center text-slate-500 text-xs space-y-2">
                  <p>No matching patient found in clinic database.</p>
                  {query.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleChooseWalkIn(query)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-lg text-xs font-bold transition"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Prescribe as Unregistered Walk-in &quot;{query}&quot;
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {results.map((p, idx) => {
                    const isHighlighted = idx === activeIndex;
                    const isServing = p.queueStatus === 'SERVING';
                    const isWaiting = p.queueStatus === 'WAITING' || p.queueStatus === 'BUFFERED';

                    return (
                      <button
                        key={p.id || p.appointmentId || idx}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                          isHighlighted ? 'bg-brand-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                            isServing
                              ? 'bg-emerald-600 text-white'
                              : isWaiting
                              ? 'bg-amber-500 text-white'
                              : 'bg-brand-100 text-brand-800'
                          }`}
                        >
                          {p.tokenCode ? p.tokenCode.slice(-3) : <User className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {p.fullName}
                            </span>

                            {isServing && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] py-0">
                                Serving in Cockpit
                              </Badge>
                            )}
                            {isWaiting && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] py-0">
                                In Queue ({p.tokenCode})
                              </Badge>
                            )}
                            {p.id && !p.isQueued && (
                              <Badge variant="outline" className="text-[9px] text-slate-600 py-0">
                                Registered Patient
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            {p.age !== null && (
                              <span>
                                {p.age} yrs {p.gender ? `· ${p.gender}` : ''}
                              </span>
                            )}
                            {p.phoneNumber && (
                              <span className="font-mono text-slate-600">{p.phoneNumber}</span>
                            )}
                            {p.allergies && p.allergies.length > 0 && (
                              <span className="text-amber-700 font-semibold bg-amber-50 px-1 rounded text-[10px]">
                                ⚠️ Allergic: {p.allergies.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 self-center" />
                      </button>
                    );
                  })}

                  {/* Fallback to Walk-in option at bottom if user typed query */}
                  {query.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleChooseWalkIn(query)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-900 transition text-xs font-semibold border-t border-slate-100"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-brand-600" />
                      <span>
                        Use &quot;<strong className="text-slate-900">{query}</strong>&quot; as an unregistered walk-in patient
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
