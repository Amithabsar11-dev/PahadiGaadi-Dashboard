import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import routes from "./AppNavigator/routes";

export default function App() {
  return (
    <>
       <BrowserRouter>
      <Routes>
        {routes.map(({ path, element, children }, index) =>
          children ? (
            <Route key={index} path={path} element={element}>
              {children.map(({ path, element }, i) => (
                <Route key={i} path={path} element={element} />
              ))}
            </Route>
          ) : (
            <Route key={index} path={path} element={element} />
          )
        )}
      </Routes>
    </BrowserRouter>
    </>
  );
}
