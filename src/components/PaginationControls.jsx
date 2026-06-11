import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function clampPage(page, totalPages) {
  return Math.min(Math.max(Number(page) || 1, 1), Math.max(totalPages, 1));
}

export function usePagination(items = [], options = {}) {
  const {
    initialPageSize = 10,
    resetKey = "",
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    setPage((current) => clampPage(current, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (clampPage(page, totalPages) - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, totalPages]);

  const from = totalItems === 0 ? 0 : (clampPage(page, totalPages) - 1) * pageSize + 1;
  const to = Math.min(clampPage(page, totalPages) * pageSize, totalItems);

  return {
    page: clampPage(page, totalPages),
    pageSize,
    setPage,
    setPageSize: (value) => setPageSize(Number(value) || initialPageSize),
    totalPages,
    totalItems,
    from,
    to,
    pageItems,
  };
}

export default function PaginationControls({
  pagination,
  label = "registros",
  className = "",
}) {
  if (!pagination) return null;

  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    totalItems,
    from,
    to,
  } = pagination;

  return (
    <div className={`pagination-bar ${className}`.trim()}>
      <div className="pagination-info">
        <strong>{from}-{to}</strong> de <strong>{totalItems}</strong> {label}
      </div>

      <div className="pagination-actions">
        <label className="pagination-size">
          Ver
          <select value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-secondary btn-page"
          onClick={() => setPage(1)}
          disabled={page <= 1}
        >
          «
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-page"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <span className="pagination-current">Página {page} de {totalPages}</span>
        <button
          type="button"
          className="btn btn-secondary btn-page"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-page"
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
        >
          »
        </button>
      </div>
    </div>
  );
}
