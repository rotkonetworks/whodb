import { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type UrlParamsArgs = Record<string, string | undefined>;
export type UrlParams = {
  [key: string]: string | undefined;
};

export function useUrlParams() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlParams = useMemo(() => {
    const searchParams = Object.fromEntries(new URLSearchParams(location.search));
    console.debug({ searchParams });
    return searchParams;
  }, [location.search]);

  const updateUrlParams = useCallback((params: UrlParamsArgs) => {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value)
    ).toString();
    navigate(`${location.pathname}${queryString ? "?" + queryString : ""}`, { replace: true });
    console.debug({ queryString, location });
  }, []);

  const setParam = useCallback((key: string, value: string | undefined) => {
    const newParams = { ...urlParams, [key]: value };
    updateUrlParams(newParams);
  }, [urlParams, updateUrlParams]);

  const deleteParam = useCallback((key: string) => {
    const newParams = { ...urlParams };
    delete newParams[key];
    updateUrlParams(newParams);
  }, [urlParams, updateUrlParams]);

  return { urlParams, updateUrlParams, setParam, deleteParam };
}
