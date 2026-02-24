// 전역으로 사용할 공통 유틸리티 함수 모음
console.log("GREY CITY SYSTEM INITIALIZED.");

// 모달 공통 애니메이션 제어
window.openModalAnimation = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const content = modal.querySelector('.modal-content') || modal.querySelector('.modalContent');
    modal.style.display = "block";
    void modal.offsetWidth; 
    modal.classList.add('active');
    if(content) content.classList.add('appears');
};

window.closeModalAnimation = function(modal) {
    if (!modal) return;
    const content = modal.querySelector('.modal-content') || modal.querySelector('.modalContent');
    modal.classList.remove('active');
    if(content) content.classList.remove('appears');
    setTimeout(() => {
        if (!modal.classList.contains('active')) {
            modal.style.display = "none";
        }
    }, 400); 
};

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        window.closeModalAnimation(event.target);
    }
});

// X 버튼 닫기 공통 이벤트
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            window.closeModalAnimation(e.target.closest('.modal'));
        });
    });
});