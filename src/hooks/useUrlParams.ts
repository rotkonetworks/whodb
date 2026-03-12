import { useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

export type UrlParamsArgs = Record<string, string | undefined>;
export type UrlParams = {
  [key: string]: string | undefined;
};

export function useUrlParams() {
  const location = useLocation();
  const [query, setQuery] = useSearchParams();

  const urlParams = query.entries()
    ? Object.fromEntries(query.entries())
    : {};

  const updateUrlParams = useCallback((params: UrlParamsArgs) => {
    const newParams: Record<string, string | undefined> = { ...Object.fromEntries(query.entries()), ...params };
    Object.keys(newParams).forEach((key) => {
      if (newParams[key] === undefined) {
        delete newParams[key];
      }
    });
    setQuery(newParams as any);
    console.debug({ queryString: newParams, location });
  }, [location, query, setQuery]);

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
