import { useState, useRef, useEffect } from "react";
export let activeTablLineRef;
export let activeTabRef;

const InPageNavigation = ({ routes,defaultHidden=[], defaultActiveIndex=0 , children}) => {
  const [inPageNavIndex, setInpageNavIndex] = useState(defaultActiveIndex);
   activeTablLineRef = useRef();
   activeTabRef=useRef();

  const changePageState = (btn, i) => {
    let { offsetWidth, offsetLeft } = btn;
    activeTablLineRef.current.style.width = offsetWidth + "px";
    activeTablLineRef.current.style.left = offsetLeft + "px";

    setInpageNavIndex(i);
  };

  useEffect(()=>{
    changePageState(activeTabRef.current,defaultActiveIndex)
  },[])

  return (
    <>
      <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
        {routes.map((route, i) => (

          <button
            ref={i==defaultActiveIndex? activeTabRef: null}
            key={i}
            className={`p-4 px-5 capitalize ${
                inPageNavIndex === i ? "text-black" : "text-dark-grey"
            }  ${defaultHidden.includes(route) ? "md:hidden" : ""}`}
              
            onClick={(e) => {
              setInpageNavIndex(i); // Update the active index
              changePageState(e.target, i);
            }}
          >
            {route}
          </button>
        ))}

        <hr ref={activeTablLineRef} className="absolute bottom-0 durartion-300"></hr>
      </div>

      {Array.isArray([children]) ?children[inPageNavIndex]:children }
    </>
  );
};

export default InPageNavigation;
