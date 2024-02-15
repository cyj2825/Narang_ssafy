import { DragDropContext } from "react-beautiful-dnd";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, Fragment } from "react";
import axios from "axios";

import { scheduleActions } from "../store/scheduleSlice";
import { ModalPortal } from "../components/modals/ModalPortal";
import Plan from "../components/Planning/Plan";
import Map from "../components/GoogleMap/Map";
import SavePlanModal from "../components/modals/SavePlanModal";
import ShowTime from "../components/Planning/ShowTime";

const MakePlanPage = () => {
  let list = useSelector((state) => state.schedule);
  const card = useSelector((state) => state.places);
  //
  const curUserId = useSelector((state) => state.auth).userId;
  const [isSavePlanOpen, setIsSavePlanOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isCanModify, setIsCanModify] = useState(true);
  const [checkuser, setCheckuser] = useState(false);
  const [res, setRes] = useState();

  const { planId } = useParams();

  useEffect(() => {
    const tmpList = window.sessionStorage.getItem("tmpPlan");
    if (tmpList !== null) {
      dispatch(scheduleActions.setSchedule(JSON.parse(tmpList)));
    }
    return () => {
      window.sessionStorage.removeItem("tmpPlan");
    };
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("tmpPlan", JSON.stringify(list));
  }, [list]);

  const setInitSchedule = async () => {
    console.log("MakePlanPage.jsx 26 planId", planId);
    if (planId !== undefined) {
      setIsCanModify(false);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_PLAN_REQUEST_URI}/plan/${planId}`
        );
        setRes(response);
        console.log("response.data : ", response.data);
        dispatch(
          scheduleActions.setSchedule(
            JSON.parse(decodeURIComponent(window.atob(response.data.planInfo)))
          )
        );
        console.log("MakePlan.jsx 57", curUserId);
        if (response.data.ownerId === curUserId) setCheckuser(true);
        for (let i = 0; i < response.data.participantIds.length; i++) {
          if (response.data.participantIds[i].participantId === curUserId)
            setCheckuser(true);
        }
        console.log("MakePlan.jsx 63", checkuser);
      } catch (error) {
        console.log("Error : ", error);
        alert("삭제되었거나 없는 계획입니다.");
        navigate(-1);
      }
    }
  };

  useEffect(() => {
    setInitSchedule();
  }, [planId]);

  useMemo(async () => {
    let tmplist = list.list;
    let modifiedList = JSON.parse(JSON.stringify(tmplist));
    for (let i = 0; i < tmplist.length; i++) {
      let prevLoca = null;
      let prevIdx = 0;
      for (let j = 0; j < tmplist[i].length; j++) {
        if (tmplist[i][j].title !== null && tmplist[i][j].title !== undefined) {
          let curLoca = tmplist[i][j].loca;
          modifiedList[i][j].distance = undefined;
          let curIdx = j;
          if (prevLoca !== null) {
            const minute = await getDuration(prevLoca, curLoca);
            modifiedList[i][prevIdx].distance = Math.ceil(minute / 60);
            const cnt = Math.ceil(minute / 600);
            if (curIdx - prevIdx - 1 < cnt) {
              for (let k = 0; k < cnt - (curIdx - prevIdx - 1); k++) {
                if (modifiedList[i][curIdx + k + 1].title === undefined) {
                  modifiedList[i].splice(curIdx + k + 1, 1);
                } else {
                  modifiedList[i].pop();
                }
                modifiedList[i].splice(prevIdx + 1, 0, []);
              }
            }
          }
          prevLoca = curLoca;
          prevIdx = curIdx;
        }
      }
    }

    dispatch(scheduleActions.setList(modifiedList));

    async function getDuration(pl, cl) {
      return new Promise((resolve, reject) => {
        const directionsService =
          new window.google.maps.DistanceMatrixService();
        directionsService.getDistanceMatrix(
          {
            origins: [new window.google.maps.LatLng(pl[0], pl[1])],
            destinations: [new window.google.maps.LatLng(cl[0], cl[1])],
            travelMode: "TRANSIT",
          },
          (response, status) => {
            if (status === "OK") {
              resolve(response.rows[0].elements[0].duration.value);
            } else {
              console.log("Error:", status);
              reject(new Error("Error:" + status));
            }
          }
        );
      });
    }
  }, [JSON.stringify(list.list)]);

  // useMemo(() => {
  //   // 현재 URL에서 Base64로 인코딩된 JSON 문자열 추출
  //   let urlParams = new URL(document.URL).searchParams;
  //   let base64EncodedString = urlParams.get("a");
  //   if (base64EncodedString !== null) {
  //     console.log(base64EncodedString);

  //     // Base64 디코딩 후 UTF-8 디코딩하여 JSON 문자열 추출
  //     let utf8EncodedString = atob(base64EncodedString);
  //     console.log(utf8EncodedString);
  //     let jsonString = decodeURIComponent(escape(utf8EncodedString));

  //     // JSON 문자열을 JavaScript 객체로 변환
  //     let getList = JSON.parse(jsonString);
  //     console.log(getList.blackHeight);

  //     if (getList.blackHeight !== 0) {
  //       dispatch(scheduleActions.setSchedule(getList));
  //       list = getList;
  //       console.log(list);
  //       window.history.pushState(
  //         {},
  //         null,
  //         "/makeplan/?a=" + btoa(unescape(encodeURIComponent(JSON.stringify(list))))
  //       );
  //     }
  //   }
  // }, [list]);
  const onDragStart = (start) => {
    if (!isCanModify) {
      start.preventDefault();
    }
  };

  const onDragEnd = async ({ source, destination }) => {
    // console.log(source);
    // console.log(destination);
    if (!destination) return; // 범위밖일 때 드래그 취소
    const idx = Number(destination.droppableId.substr(4));
    if (source.droppableId === "PlaceCard") {
      // 추가;
      console.log(card[source.index].loca);
      const schedule = {
        img: card[source.index].photo,
        title: card[source.index].name,
        loca: card[source.index].loca,
        time: "120",
        distance: "",
        comment: "",
      };
      dispatch(
        scheduleActions.addSchedule({
          schedule: schedule,
          index: destination.index,
          day: idx,
        })
      );
    } else {
      // 이동
      const idx2 = Number(source.droppableId.substr(4));
      dispatch(
        scheduleActions.moveSchedule({
          start: { day: idx2, index: source.index },
          end: { day: idx, index: destination.index },
        })
      );
    }
  };

  const doModifyPlan = async () => {
    const base64Incoding = window.btoa(
      encodeURIComponent(JSON.stringify(list))
    );
    console.log("res 테스트 : ", res);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_PLAN_REQUEST_URI}/update`,
        {
          planId: planId,
          planName: res.data.planName,
          planDesc: res.data.planDesc,
          lastModifiedDate: "",
          ownerId: res.data.ownerId,
          participantIds: res.data.participantIds,
          planInfo: base64Incoding,
        }
      );
      console.log("수정결과 : ", response);
    } catch (error) {
      console.log("수정 Error : ", error);
    }
  };

  // 계획 저장하기 모달
  const savePlan = () => {
    if (planId !== undefined) {
      doModifyPlan();
      setIsCanModify(false);
      setCheckuser(true);
    } else {
      setIsSavePlanOpen(true);
    }
  };
  const CloseSavePlanModal = () => {
    setIsSavePlanOpen(false);
  };

  const modifyPlan = () => {
    setIsCanModify(true);
    setCheckuser(false);
  };

  const deletePlan = async () => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_PLAN_REQUEST_URI}/plan/${planId}`
      );
      console.log("삭제결과 : ", response);
    } catch (error) {
      console.log("삭제중 Error: ", error);
    }
    navigate(-1);
  };

  useEffect(() => {
    // 모달이 열렸을 때 스크롤 막기 위함
    if (isSavePlanOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isSavePlanOpen]);

  return (
    <div className="h-full">
      <ShowTime />
      <div className="relative h-full pl-10">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex h-full">
            <Plan isCanModify={isCanModify} />
            <Map isCanModify={isCanModify} />
          </div>
        </DragDropContext>
        {isCanModify && (
          <button
            className="absolute top-0 right-0 py-3 mr-2 text-sm font-medium text-yellow-800 bg-yellow-200 rounded-md ring-1 ring-inset ring-yellow-800/10"
            onClick={savePlan}
          >
            저장하기
          </button>
        )}
        {checkuser && (
          <div className="absolute top-0 right-0 flex gap-2">
            <button
              className="text-sm font-medium text-yellow-800 bg-yellow-200 rounded-md ring-1 ring-inset ring-yellow-800/10"
              onClick={modifyPlan}
            >
              수정하기
            </button>
            <button
              className="text-sm font-medium text-red-800 bg-red-200 rounded-md ring-1 ring-inset ring-red-800/10"
              onClick={deletePlan}
            >
              삭제하기
            </button>
          </div>
        )}
        {isSavePlanOpen && (
          <ModalPortal>
            <SavePlanModal onClose={CloseSavePlanModal} planId={planId} />
          </ModalPortal>
        )}
      </div>
    </div>
  );
}

export default MakePlanPage;