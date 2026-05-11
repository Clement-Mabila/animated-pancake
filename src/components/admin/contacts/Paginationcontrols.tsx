'use client'
// src/components/admin/contacts/PaginationControls.tsx
import React from 'react'
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'

interface PaginationState {
  currentPage: number
  totalPages: number
  pageNumbers: (number | string)[]
  setCurrentPage: (page: number) => void
}

interface Props {
  pagination: PaginationState
}

export default function PaginationControls({ pagination }: Props) {
  const { currentPage, totalPages, pageNumbers, setCurrentPage } = pagination

  return (
    <Pagination>
      <PaginationContent className="space-x-1 text-xs">
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {pageNumbers.map((num, i) => {
          if (num === 'ellipsis-start' || num === 'ellipsis-end') {
            return (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            )
          }
          return (
            <PaginationItem key={num}>
              <PaginationLink
                onClick={() => setCurrentPage(num as number)}
                isActive={currentPage === num}
                className={currentPage === num ? 'rounded-full cursor-pointer' : 'cursor-pointer'}
              >
                {num}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        <PaginationItem>
          <PaginationNext
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}