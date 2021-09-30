import React, { useEffect, useContext, useState, Fragment } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import FontIconPicker from "@fonticonpicker/react-fonticonpicker";
import faIcons from "./elements/faicons";
import { craftToSaltcorn } from "./storage";
import optionsCtx from "./context";
import { WrapElem } from "./Toolbox";

const twoByTwos = (xs) => {
  if (xs.length <= 2) return [xs];
  const [x, y, ...rest] = xs;
  return [[x, y], ...twoByTwos(rest)];
};

export const LibraryElem = ({ name, layout }) => {
  const {
    selected,
    connectors: { connect, drag },
  } = useNode((node) => ({ selected: node.events.selected }));
  return (
    <Fragment>
      <span
        className={selected ? "selected-node" : ""}
        ref={(dom) => connect(drag(dom))}
      >
        LibElem
      </span>
      <br />
    </Fragment>
  );
};

LibraryElem.craft = {
  displayName: "LibraryElem",
};

export const InitNewElement = ({ nodekeys }) => {
  const { actions, query, connectors } = useEditor((state, query) => {
    return {};
  });
  const options = useContext(optionsCtx);
  const onNodesChange = (arg, arg1) => {
    console.log("onNodesChange", arg, arg1);
    const nodes = arg.getSerializedNodes();
    const newNodeIds = [];
    Object.keys(nodes).forEach((id) => {
      if (!nodekeys.current.includes(id)) {
        newNodeIds.push(id);
      }
    });
    nodekeys.current = Object.keys(nodes);
    console.log({ nodes, newNodeIds, nodekeys: nodekeys.current });
    if (newNodeIds.length === 1) {
      const id = newNodeIds[0];
      const node = nodes[id];
      console.log("new node", node);
      if (node.displayName === "LibraryElem") {
        setTimeout(() => {
          actions.delete(id);
        }, 0);
      } else {
        actions.selectNode(id);
      }
    }
  };
  useEffect(() => {
    const nodes = query.getSerializedNodes();
    nodekeys.current = Object.keys(nodes);
    actions.setOptions((options) => {
      const oldf = options.onNodesChange(
        (options.onNodesChange = oldf
          ? (q) => {
              oldf(q);
              onNodesChange(q);
            }
          : onNodesChange)
      );
    });
  }, []);

  return [];
};

export const Library = () => {
  const { actions, selected, query, connectors } = useEditor((state, query) => {
    const currentNodeId = state.events.selected;
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,

        isDeletable: query.node(currentNodeId).isDeletable(),
      };
    }

    return {
      selected,
    };
  });
  const options = useContext(optionsCtx);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [icon, setIcon] = useState();
  const [recent, setRecent] = useState([]);

  const addSelected = () => {
    if (!adding) setAdding(true);
    else {
      const layout = craftToSaltcorn(JSON.parse(query.serialize()));
      const data = { layout, icon, name: newName };
      fetch(`/library/savefrombuilder`, {
        method: "POST", // or 'PUT'
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": options.csrfToken,
        },
        body: JSON.stringify(data),
      });
      setAdding(false);
      setIcon();
      setNewName("");
      setRecent([...recent, data]);
    }
  };

  const elemRows = twoByTwos([...(options.library || []), ...recent]);
  return (
    <div className="builder-library">
      {adding && selected ? (
        <Fragment>
          <label>Name</label>
          <input
            type="text"
            className="form-control"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <label>Icon</label>
          <FontIconPicker
            className="w-100"
            value={icon}
            icons={faIcons}
            onChange={setIcon}
            isMulti={false}
          />
        </Fragment>
      ) : null}
      <button
        className={`btn btn-sm btn-${!adding ? "outline-" : ""}primary mt-2`}
        onClick={addSelected}
        disabled={!selected}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-1" />
        Add
      </button>
      {adding && (
        <button
          className={`btn btn-sm btn-outline-secondary ml-2 mt-2`}
          onClick={() => setAdding(false)}
        >
          <FontAwesomeIcon icon={faTimes} className="mr-1" />
        </button>
      )}
      <div className="card mt-2">
        {elemRows.map((els, ix) => (
          <div className="toolbar-row" key={ix}>
            {els.map((l, ix) => (
              <WrapElem
                key={ix}
                connectors={connectors}
                icon={l.icon}
                label={l.name}
              >
                <LibraryElem name={l.name} layout={l.layout}></LibraryElem>
              </WrapElem>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
